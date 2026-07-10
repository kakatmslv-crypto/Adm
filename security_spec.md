# Security Specification & Test-Driven Development (TDD) for Firestore Security Rules

## 1. Data Invariants

1. **Global Catch-All**: All read/write access is denied by default unless explicitly allowed by specific rules.
2. **Operator Authorization**: Only authenticated users (admins/librarians) registered in the system can create, read, update, or delete books, categories, students, or borrow records.
3. **Admin Exclusivity**: Admin configuration actions or user profile updates to assign roles are restricted. Self-assignment of elevated privileges is completely forbidden.
4. **Verified Session**: Write operations must mandate that the operator is authenticated and has a valid token.
5. **No Identity Spoofing**: Users cannot spoof their identifier. For writes, `incoming().id` or `incoming().userId` must align with `request.auth.uid`.
6. **Temporal Integrity**: Fields like `createdAt` or `updatedAt` must leverage `request.time`. Immutables like book IDs and barcodes must not change after creation.
7. **Value Bounds & Schema Types**: Every string must have a length limit (e.g., `< 256` or `< 1024` characters for descriptions) to prevent denial-of-wallet resource attacks.
8. **Valid ID Checks**: IDs must conform to alphanumeric characters to prevent ID poisoning / injection attacks.

---

## 2. The "Dirty Dozen" Payloads

Here are 12 malicious or invalid payloads designed to break system invariants, all of which must return `PERMISSION_DENIED`.

### Payload 1: Unauthorized Category Creation (Anonymous Write)
* **Target**: `/categories/cat-malicious`
* **Violates**: Authentication Requirement
* **Payload**:
```json
{
  "id": "cat-malicious",
  "nameKh": "ខុសច្បាប់",
  "nameEn": "Malicious Category"
}
```

### Payload 2: Self-Promotion to Admin Role (Privilege Escalation)
* **Target**: `/users/{any_uid}`
* **Violates**: Role Integrity
* **Payload**:
```json
{
  "id": "attacker-uid",
  "username": "attacker",
  "name": "Attacker",
  "role": "admin"
}
```

### Payload 3: Book Creation with Spoofed Status (State Shortcutting)
* **Target**: `/books/book-malicious`
* **Violates**: Initial state must be "available" or "lost" upon creation. Setting "borrowed" or "overdue" without a transaction record is invalid.
* **Payload**:
```json
{
  "id": "book-malicious",
  "title": "Cheat Codes",
  "barcode": "BAD-BARCODE",
  "categoryId": "cat-kh",
  "author": "Hacker",
  "publishYear": 2026,
  "status": "overdue",
  "addedDate": "2026-07-01"
}
```

### Payload 4: Injecting Gigantic ID String (Resource Poisoning/ID Injection)
* **Target**: `/books/<10KB string with special characters>`
* **Violates**: ID Formatting Constraints & Path Variable Hardening
* **Payload**:
```json
{
  "id": "long-id-poison-...",
  "title": "Valid Title",
  "barcode": "TEST-123",
  "categoryId": "cat-kh",
  "author": "Author",
  "publishYear": 2024,
  "status": "available",
  "addedDate": "2026-07-01"
}
```

### Payload 5: Spoofing Creation Timestamp (Temporal Compromise)
* **Target**: `/books/book-temp`
* **Violates**: Temporal Integrity (addedDate or timestamp must not be client-backdated to years ago)
* **Payload**:
```json
{
  "id": "book-temp",
  "title": "Fake Past Book",
  "barcode": "BAR-001",
  "categoryId": "cat-kh",
  "author": "Historian",
  "publishYear": 2020,
  "status": "available",
  "addedDate": "1999-01-01"
}
```

### Payload 6: Modifying Immutable Barcode on Book (Immortal Field Violation)
* **Target**: `/books/book-1` (Update)
* **Violates**: Barcode immutability
* **Payload**:
```json
{
  "barcode": "NEW-BARCODE-FOR-BOOK-1"
}
```

### Payload 7: Overwriting Book Status Directly to Overdue/Borrowed Without Transaction (Tiers Bypass)
* **Target**: `/books/book-1` (Update status directly by an unauthorized operator)
* **Violates**: Tiers of identity logic / restricted updates
* **Payload**:
```json
{
  "status": "overdue"
}
```

### Payload 8: Student Creation with Missing Required Phone (Schema Gap)
* **Target**: `/students/stu-malformed`
* **Violates**: Property Completeness & Strict Schema Validation
* **Payload**:
```json
{
  "id": "stu-malformed",
  "studentId": "STU-12A-99",
  "name": "Missing Phone Student",
  "gender": "M",
  "classGrade": "12A"
}
```

### Payload 9: Hijacking Another User's Session Record (Identity Spoofing)
* **Target**: `/users/operator-2`
* **Violates**: Identity boundaries
* **Payload**:
```json
{
  "id": "operator-2",
  "name": "I am Admin Now"
}
```

### Payload 10: Creating Borrow Record with Negative/Backdated Dates (Temporal Integrity)
* **Target**: `/borrowRecords/rec-bad-date`
* **Violates**: Temporal logic consistency (borrowDate after dueDate)
* **Payload**:
```json
{
  "id": "rec-bad-date",
  "bookId": "book-1",
  "studentId": "stu-1",
  "borrowDate": "2026-07-10",
  "dueDate": "2026-07-01",
  "status": "borrowed"
}
```

### Payload 11: Bulk Unbounded Array Injection in Student Records (Resource Exhaustion/Denial of Wallet)
* **Target**: `/students/stu-1` (Adding infinite subcollection or payload > 1MB)
* **Violates**: Strict string size and structure boundaries
* **Payload**:
```json
{
  "name": "A".repeat(1000000),
  "gender": "M",
  "classGrade": "12A",
  "phoneNumber": "012345678"
}
```

### Payload 12: Changing Status of Completed/Terminal Borrow Record (Terminal State Locking)
* **Target**: `/borrowRecords/rec-completed` (Updating returned record back to overdue/borrowed to corrupt history)
* **Violates**: Terminal State Locking
* **Payload**:
```json
{
  "status": "borrowed",
  "returnDate": null
}
```

---

## 3. The Test Runner

Below is the complete testing framework definition `firestore.rules.test.ts` representing the TDD architecture:

```typescript
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

describe('Hun Sen Andoung Meas High School Library Rules Tests', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'gen-lang-client-0206811831',
      firestore: {
        host: 'localhost',
        port: 8080,
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  test('Reject Payload 1: Anonymous category creation', async () => {
    const context = testEnv.unauthenticatedContext();
    const db = context.firestore();
    const ref = doc(db, 'categories/cat-malicious');
    await expect(setDoc(ref, {
      id: 'cat-malicious',
      nameKh: 'ខុសច្បាប់',
      nameEn: 'Malicious Category'
    })).rejects.toThrow();
  });

  test('Reject Payload 2: Self-promotion to admin role', async () => {
    const context = testEnv.authenticatedContext('attacker-uid');
    const db = context.firestore();
    const ref = doc(db, 'users/attacker-uid');
    await expect(setDoc(ref, {
      id: 'attacker-uid',
      username: 'attacker',
      name: 'Attacker',
      role: 'admin'
    })).rejects.toThrow();
  });

  test('Reject Payload 3: Direct state shortcutting on book', async () => {
    const context = testEnv.authenticatedContext('librarian-uid');
    const db = context.firestore();
    const ref = doc(db, 'books/book-malicious');
    await expect(setDoc(ref, {
      id: 'book-malicious',
      title: 'Cheat Codes',
      barcode: 'BAD-BARCODE',
      categoryId: 'cat-kh',
      author: 'Hacker',
      publishYear: 2026,
      status: 'overdue',
      addedDate: '2026-07-01'
    })).rejects.toThrow();
  });
});
```
