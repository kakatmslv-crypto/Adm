import React, { useState, useEffect, useMemo } from 'react';
import { Book, Student, BorrowRecord, Category, Language } from '../types';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Play, 
  HelpCircle, 
  Layers, 
  Database, 
  ArrowRight, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Terminal, 
  Workflow, 
  RefreshCw, 
  Code, 
  FileCode, 
  Wifi, 
  Rss, 
  Server, 
  Cpu, 
  Users, 
  BookMarked, 
  ClipboardList, 
  FileJson, 
  HelpCircle as QuestionIcon,
  Sparkles,
  Info
} from 'lucide-react';

interface GraphQLDeveloperHubProps {
  books: Book[];
  students: Student[];
  records: BorrowRecord[];
  categories: Category[];
  language: Language;
  onAddBook?: (book: Omit<Book, 'id'>) => void;
  onReturnBook?: (recordId: string, returnDate: string, fineAmount: number, notes: string) => void;
}

export default function GraphQLDeveloperHub({
  books,
  students,
  records,
  categories,
  language,
  onAddBook,
  onReturnBook
}: GraphQLDeveloperHubProps) {
  // Tabs
  const [activeTab, setActiveTab] = useState<'sandbox' | 'flow' | 'schema' | 'comparison' | 'bestpractices'>('sandbox');

  // Sandbox State
  const [queryInput, setQueryInput] = useState<string>(`query GetLibraryBooks {
  books {
    id
    title
    author
    status
  }
}`);
  const [queryVariables, setQueryVariables] = useState<string>('{\n  "limit": 5\n}');
  const [queryResponse, setQueryResponse] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [execStep, setExecStep] = useState<number>(0);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  
  // For Subscriptions tab inside playground
  const [subEvents, setSubEvents] = useState<Array<{ id: string; event: string; timestamp: string; payload: any }>>([]);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);

  // REST vs GraphQL interactive field selection
  const [selectedRestFields, setSelectedRestFields] = useState<string[]>(['id', 'title', 'author', 'status']);
  const availableFields = ['id', 'title', 'barcode', 'author', 'publishYear', 'status', 'location', 'addedDate', 'categoryId'];

  // Best practices accordion
  const [selectedPractice, setSelectedPractice] = useState<number>(0);

  // Pre-configured templates
  const queryTemplates = [
    {
      nameEn: "1. Get All Books (Query)",
      nameKh: "១. ទាញយកសៀវភៅទាំងអស់ (Query)",
      query: `query GetLibraryBooks {
  books {
    id
    title
    author
    status
  }
}`
    },
    {
      nameEn: "2. Get Single Student by ID (Variables)",
      nameKh: "២. ស្វែងរកសិស្សម្នាក់តាមលេខសម្គាល់ (Variables)",
      query: `query GetStudentDetails($id: ID!) {
  student(id: $id) {
    studentId
    name
    classGrade
    phoneNumber
  }
}`,
      variables: `{\n  "id": "${students[0]?.id || 'STU-001'}"\n}`
    },
    {
      nameEn: "3. Add New Book (Mutation)",
      nameKh: "៣. បន្ថែមសៀវភៅថ្មី (Mutation)",
      query: `mutation AddNewBook($title: String!, $author: String!, $barcode: String!, $categoryId: ID!) {
  addBook(title: $title, author: $author, barcode: $barcode, categoryId: $categoryId) {
    id
    title
    author
    barcode
  }
}`,
      variables: `{\n  "title": "GraphQL Mastery",\n  "author": "DeepMind Experts",\n  "barcode": "9781234567890",\n  "categoryId": "${categories[0]?.id || 'CAT-1'}"\n}`
    },
    {
      nameEn: "4. Return Outstanding Book (Mutation)",
      nameKh: "៤. សងសៀវភៅត្រឡប់មកវិញ (Mutation)",
      query: `mutation ReturnBook($recordId: ID!) {
  returnBook(id: $recordId) {
    id
    status
    returnDate
  }
}`,
      variables: `{\n  "recordId": "${records.find(r => !r.returnDate)?.id || 'REC-001'}"\n}`
    },
    {
      nameEn: "5. Real-Time Borrow Alerts (Subscription)",
      nameKh: "៥. ការជូនដំណឹងខ្ចីភ្លាមៗ (Subscription)",
      query: `subscription OnBookBorrowed {
  bookBorrowed {
    bookId
    studentId
    borrowDate
  }
}`
    },
    {
      nameEn: "6. Get Social Posts (Query)",
      nameKh: "៦. ទាញយកអត្ថបទ Posts (Query)",
      query: `query GetPosts($limit: Int, $offset: Int, $status: String) {
  posts(limit: $limit, offset: $offset, status: $status) {
    id
    title
    content
    status
    author {
      id
      username
      fullName
    }
    comments {
      id
      content
      author {
        username
      }
    }
    likesCount
  }
}`,
      variables: `{\n  "limit": 3,\n  "offset": 0,\n  "status": "published"\n}`
    },
    {
      nameEn: "7. Create Social Post (Mutation)",
      nameKh: "៧. បង្កើតអត្ថបទ Post ថ្មី (Mutation)",
      query: `mutation CreatePost($title: String!, $content: String!, $tags: [String!]) {
  createPost(
    title: $title
    content: $content
    tags: $tags
  ) {
    id
    title
    content
    status
    tags {
      id
      name
    }
  }
}`,
      variables: `{\n  "title": "A Primer on GraphQL Schema Design",\n  "content": "GraphQL schemas define a typed contract between client and server...",\n  "tags": ["graphql", "api", "tutorial"]\n}`
    },
    {
      nameEn: "8. Create New User (Mutation)",
      nameKh: "៨. បង្កើតគណនីអ្នកប្រើប្រាស់ (Mutation)",
      query: `mutation CreateUser($input: CreateUserInput!) {
  createUser(
    username: $input.username
    email: $input.email
    password: $input.password
    fullName: $input.fullName
  ) {
    id
    username
    email
    token
  }
}`,
      variables: `{\n  "input": {\n    "username": "sok_visal",\n    "email": "visal@hsam.edu.kh",\n    "password": "hashed_secure_password",\n    "fullName": "Sok Visal"\n  }\n}`
    },
    {
      nameEn: "9. Get User Profile & Posts (Query)",
      nameKh: "៩. ទាញយកព័ត៌មានអ្នកប្រើប្រាស់ និងអត្ថបទ (Query)",
      query: `query GetUser($id: Int!) {
  user(id: $id) {
    id
    username
    email
    fullName
    posts {
      id
      title
      content
      status
    }
  }
}`,
      variables: `{\n  "id": 101\n}`
    }
  ];

  // Load a query template
  const handleLoadTemplate = (template: typeof queryTemplates[0]) => {
    setQueryInput(template.query);
    if (template.variables) {
      setQueryVariables(template.variables);
    } else {
      setQueryVariables('{\n  "limit": 5\n}');
    }
    setSandboxError(null);
    setQueryResponse(null);
  };

  // Helper: Format JSON nicely
  const formatJSON = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  // Parse and run our GraphQL simulation interpreter
  const handleExecuteGraphQL = async () => {
    setIsExecuting(true);
    setSandboxError(null);
    setQueryResponse(null);
    setExecStep(1); // 1. Parsing & validating

    // Simulate Network & Resolution phases
    await new Promise(r => setTimeout(r, 600));
    setExecStep(2); // 2. Resolver Invocation

    await new Promise(r => setTimeout(r, 700));
    setExecStep(3); // 3. Database Accessing

    await new Promise(r => setTimeout(r, 600));
    setExecStep(4); // 4. Assembling and returning shape

    try {
      // Basic manual AST-like regex parsing for our simulation!
      const queryStr = queryInput.trim();
      let variablesObj: any = {};
      try {
        if (queryVariables.trim()) {
          variablesObj = JSON.parse(queryVariables);
        }
      } catch (e) {
        throw new Error("Syntax Error in JSON Variables! Please correct your JSON format.");
      }

      // Detect Operation Type
      const isMutation = queryStr.startsWith('mutation');
      const isSubscription = queryStr.startsWith('subscription');
      const isQuery = queryStr.startsWith('query') || (!isMutation && !isSubscription);

      // Extract field projection lists via curly bracket matching
      // E.g., we look for books { id title ... }
      const extractFields = (entityType: string): string[] => {
        const regex = new RegExp(`${entityType}\\s*(?:\\([^)]*\\))?\\s*\\{([^}]+)\\}`, 'i');
        const match = queryStr.match(regex);
        if (!match) return ['id', 'title']; // defaults
        return match[1]
          .split(/\s+/)
          .map(f => f.trim())
          .filter(f => f.length > 0 && !f.startsWith('{') && !f.startsWith('}'));
      };

      if (isSubscription) {
        setIsSubscribed(true);
        // Add fake subscription events
        const newEvent = {
          id: 'sub-' + Date.now(),
          event: "subscription.bookBorrowed",
          timestamp: new Date().toLocaleTimeString(),
          payload: {
            bookBorrowed: {
              bookId: books[0]?.id || "b-1",
              title: books[0]?.title || "Structure and Interpretation of Computer Programs",
              studentId: students[0]?.id || "s-1",
              studentName: students[0]?.name || "Keo Sopheak",
              borrowDate: new Date().toISOString().split('T')[0]
            }
          }
        };
        setSubEvents(prev => [newEvent, ...prev]);
        setQueryResponse({
          message: "Subscribed to real-time events. Listening on socket...",
          status: "ACTIVE_SUBSCRIPTION_STREAM_OK"
        });
        setIsExecuting(false);
        return;
      }

      if (isMutation) {
        if (queryStr.includes('addBook')) {
          // Add Book mutation
          const title = variablesObj.title || "Introduction to Algorithms";
          const author = variablesObj.author || "Cormen, Leiserson, Rivest";
          const barcode = variablesObj.barcode || `ISBN-${Date.now()}`;
          const categoryId = variablesObj.categoryId || (categories[0]?.id || "CAT-1");

          // Trigger actual add to inventory if function is provided
          if (onAddBook) {
            onAddBook({
              title,
              barcode,
              categoryId,
              author,
              publishYear: 2026,
              status: 'available',
              addedDate: new Date().toISOString().split('T')[0]
            });
          }

          const requestedFields = extractFields('addBook');
          const mockAddedBook: any = {
            id: `b-generated-${Math.floor(Math.random() * 9000 + 1000)}`,
            title,
            author,
            barcode,
            categoryId,
            status: 'available'
          };

          // Project response
          const responsePayload: any = {};
          requestedFields.forEach(field => {
            if (field in mockAddedBook) {
              responsePayload[field] = mockAddedBook[field];
            }
          });

          setQueryResponse({
            data: {
              addBook: responsePayload
            }
          });

          // Trigger live update in subscriptions stream
          if (isSubscribed) {
            setSubEvents(prev => [
              {
                id: 'sub-' + Date.now(),
                event: "subscription.bookCreated",
                timestamp: new Date().toLocaleTimeString(),
                payload: {
                  bookCreated: responsePayload
                }
              },
              ...prev
            ]);
          }

        } else if (queryStr.includes('returnBook')) {
          // Return Book mutation
          const recordId = variablesObj.recordId || (records.find(r => !r.returnDate)?.id || "REC-1");
          const record = records.find(r => r.id === recordId);

          if (!record) {
            throw new Error(`Mutation Error: Record ID "${recordId}" not found in database.`);
          }

          if (onReturnBook) {
            onReturnBook(recordId, new Date().toISOString().split('T')[0], 0, "Returned via GraphQL Mutation Sandbox API");
          }

          const requestedFields = extractFields('returnBook');
          const mockUpdatedRecord: any = {
            id: recordId,
            status: 'returned',
            returnDate: new Date().toISOString().split('T')[0],
            bookId: record.bookId,
            studentId: record.studentId
          };

          const responsePayload: any = {};
          requestedFields.forEach(field => {
            if (field in mockUpdatedRecord) {
              responsePayload[field] = mockUpdatedRecord[field];
            }
          });

          setQueryResponse({
            data: {
              returnBook: responsePayload
            }
          });
        } else if (queryStr.includes('createPost')) {
          const title = variablesObj.title || "A Primer on GraphQL Schema Design";
          const content = variablesObj.content || "GraphQL schemas define a typed contract between client and server...";
          const tags = variablesObj.tags || ["graphql", "api", "tutorial"];

          setQueryResponse({
            data: {
              createPost: {
                id: `post-${Math.floor(Math.random() * 9000 + 1000)}`,
                title,
                content,
                status: "published",
                tags: tags.map((t: string, idx: number) => ({ id: `tag-${idx}`, name: t }))
              }
            }
          });
        } else if (queryStr.includes('createUser')) {
          const input = variablesObj.input || {};
          const username = input.username || "sok_visal";
          const email = input.email || "visal@hsam.edu.kh";
          const fullName = input.fullName || "Sok Visal";

          setQueryResponse({
            data: {
              createUser: {
                id: Math.floor(Math.random() * 9000 + 1000),
                username,
                email,
                token: "gql_session_token_jwt_" + Math.random().toString(36).substring(2, 11)
              }
            }
          });
        } else {
          throw new Error("Supported sandbox mutations: addBook(...), returnBook(...), createPost(...), or createUser(...)");
        }

        setIsExecuting(false);
        return;
      }

      // Query handling
      if (queryStr.includes('books')) {
        const requestedFields = extractFields('books');
        
        // Map actual inventory books
        const dataPayload = books.slice(0, variablesObj.limit || 10).map(b => {
          const item: any = {};
          requestedFields.forEach(f => {
            if (f === 'id') item.id = b.id;
            else if (f === 'title') item.title = b.title;
            else if (f === 'author') item.author = b.author;
            else if (f === 'status') item.status = b.status;
            else if (f === 'publishYear') item.publishYear = b.publishYear;
            else if (f === 'barcode') item.barcode = b.barcode;
            else if (f === 'location') item.location = b.location || 'Shelf A-4';
          });
          return item;
        });

        setQueryResponse({
          data: {
            books: dataPayload
          }
        });
      } else if (queryStr.includes('student')) {
        const studentId = variablesObj.id || (students[0]?.id || "s-1");
        const foundStudent = students.find(s => s.id === studentId || s.studentId === studentId);
        
        if (!foundStudent) {
          throw new Error(`Query Error: Student with ID "${studentId}" not found.`);
        }

        const requestedFields = extractFields('student');
        const item: any = {};
        requestedFields.forEach(f => {
          if (f === 'id') item.id = foundStudent.id;
          else if (f === 'studentId') item.studentId = foundStudent.studentId;
          else if (f === 'name') item.name = foundStudent.name;
          else if (f === 'classGrade') item.classGrade = foundStudent.classGrade;
          else if (f === 'phoneNumber') item.phoneNumber = foundStudent.phoneNumber;
          else if (f === 'email') item.email = foundStudent.email || `${foundStudent.name.toLowerCase().replace(/\s+/g, '')}@hsam.edu.kh`;
        });

        setQueryResponse({
          data: {
            student: item
          }
        });
      } else if (queryStr.includes('records')) {
        const requestedFields = extractFields('records');
        const dataPayload = records.slice(0, 5).map(r => {
          const item: any = {};
          requestedFields.forEach(f => {
            if (f === 'id') item.id = r.id;
            else if (f === 'bookId') item.bookId = r.bookId;
            else if (f === 'studentId') item.studentId = r.studentId;
            else if (f === 'borrowDate') item.borrowDate = r.borrowDate;
            else if (f === 'dueDate') item.dueDate = r.dueDate;
            else if (f === 'status') item.status = r.status;
          });
          return item;
        });

        setQueryResponse({
          data: {
            records: dataPayload
          }
        });
      } else if (queryStr.includes('posts')) {
        const limit = variablesObj.limit || 3;
        const status = variablesObj.status || "published";
        
        // Return simulated posts list
        const mockPosts = [
          {
            id: "post-101",
            title: "Exploring GraphQL Resolvers",
            content: "Resolvers are the core execution blocks of any GraphQL schema...",
            status: status,
            author: { id: "u-42", username: "dara_dev", fullName: "Chan Dara" },
            comments: [
              { id: "c-1", content: "Super clear explanation! Thanks.", author: { username: "nary_learns" } },
              { id: "c-2", content: "Are DataLoader patterns explained too?", author: { username: "vireak_tech" } }
            ],
            likesCount: 24
          },
          {
            id: "post-102",
            title: "Type Safety in Modern APIs",
            content: "Using TypeScript and GraphQL schemas together guarantees contract-driven safety...",
            status: status,
            author: { id: "u-99", username: "sophal_codes", fullName: "Keo Sophal" },
            comments: [
              { id: "c-3", content: "Yes! Solves half of our front-end bugs.", author: { username: "dara_dev" } }
            ],
            likesCount: 41
          },
          {
            id: "post-103",
            title: "Designing Perfect Schemas",
            content: "Keep types small, leverage nesting, and document early.",
            status: status,
            author: { id: "u-42", username: "dara_dev", fullName: "Chan Dara" },
            comments: [],
            likesCount: 12
          }
        ];

        setQueryResponse({
          data: {
            posts: mockPosts.slice(0, limit)
          }
        });
      } else if (queryStr.includes('user')) {
        const id = variablesObj.id || 101;
        setQueryResponse({
          data: {
            user: {
              id: id,
              username: "sok_visal",
              email: "visal@hsam.edu.kh",
              fullName: "Sok Visal",
              posts: [
                {
                  id: "post-201",
                  title: "My First Day in School Library",
                  content: "I borrowed three computer science books today! Looking forward to learning.",
                  status: "published"
                },
                {
                  id: "post-202",
                  title: "GraphQL Sandbox Is Awesome",
                  content: "Implementing schema design on real react components.",
                  status: "published"
                }
              ]
            }
          }
        });
      } else {
        throw new Error("Syntax Error/Unknown Query: sandbox resolver supports query { books }, { student }, { records }, { posts }, or { user }");
      }

    } catch (err: any) {
      setSandboxError(err.message || "Failed to execute GraphQL query.");
    } finally {
      setIsExecuting(false);
    }
  };

  // REST vs GraphQL calculation properties
  const restPayloadSize = 460; // Average byte size of full REST response for a book
  const singleFieldSize = 45; // Average byte size of a single field
  
  const estimatedGqlSize = useMemo(() => {
    return selectedRestFields.length * singleFieldSize + 30; // 30 bytes envelope overhead
  }, [selectedRestFields]);

  const bandwidthSavings = useMemo(() => {
    const diff = restPayloadSize - estimatedGqlSize;
    if (diff <= 0) return 0;
    return Math.round((diff / restPayloadSize) * 100);
  }, [estimatedGqlSize]);

  // Translatable texts for dual languages
  const text = {
    title: language === 'kh' ? 'មជ្ឈមណ្ឌលអភិវឌ្ឍន៍ GraphQL' : 'GraphQL Developer Hub',
    subtitle: language === 'kh' 
      ? 'រៀន និងអនុវត្តផ្ទាល់នូវបច្ចេកវិទ្យា GraphQL API ជាមួយទិន្នន័យបណ្ណាល័យសាលា' 
      : 'Learn, model, and execute GraphQL APIs interactively with real-time school library data',
    playgroundTab: language === 'kh' ? 'សាកល្បងកូដ Sandbox' : 'GraphQL Sandbox',
    flowTab: language === 'kh' ? 'លំហូរដំណើរការ Resolvers' : 'Resolvers & Data Flow',
    schemaTab: language === 'kh' ? 'កិច្ចសន្យា Schema & Types' : 'Schema & Types Contract',
    comparisonTab: language === 'kh' ? 'REST vs GraphQL' : 'REST vs GraphQL',
    bestPracticesTab: language === 'kh' ? 'ការអនុវត្តល្អៗទាំង ៨' : '8 Best Practices',
    executeBtn: language === 'kh' ? 'ដំណើរការ Query' : 'Execute Operation',
    variablesTitle: language === 'kh' ? 'អថេរ Variables (JSON)' : 'Variables (JSON)',
    responseTitle: language === 'kh' ? 'លទ្ធផលចម្លើយពី Server (JSON)' : 'Server Response (JSON)',
    templatesTitle: language === 'kh' ? 'គំរូកូដរហ័ស (Templates)' : 'Quick Templates',
    subTitle: language === 'kh' ? 'ការជាវព័ត៌មាន (Live Subscriptions)' : 'Live Subscriptions Feed',
    overfetchingTitle: language === 'kh' ? 'ការការពារបញ្ហា Over-fetching ទិន្នន័យ' : 'Eliminate Data Over-fetching Interactively',
    savingsText: language === 'kh' ? 'សន្សំសំចៃកម្រិតបញ្ជូនអ៊ីនធឺណិត' : 'Bandwidth overhead saved',
  };

  // The 8 Best Practices
  const practices = [
    {
      num: "1",
      titleEn: "Design a clear schema",
      titleKh: "រៀបចំរចនាសម្ព័ន្ធ Schema ឱ្យច្បាស់លាស់",
      descEn: "Use intuitive types, names, and relationships that reflect your domain. Write descriptive schemas with schema documentation comments for automatic self-documentation.",
      descKh: "ប្រើប្រាស់ប្រភេទ (types) ឈ្មោះ និងទំនាក់ទំនងដែលឆ្លុះបញ្ចាំងពីវិស័យការងាររបស់អ្នកឱ្យបានច្បាស់លាស់។ សរសេរការពិពណ៌នា Schema ឱ្យមានរបៀបរៀបរយ ដើម្បីឱ្យវាក្លាយជាឯកសារយោងស្វ័យប្រវត្ត។",
      badCode: `type Book {
  c_id: ID
  t_val: String
  a_name: String
}`,
      goodCode: `"""
Represents an academic book stored in Hun Sen Andoung Meas High School Library database.
"""
type Book {
  id: ID!
  title: String!
  author: String!
  publishYear: Int
  status: BookStatus!
}`
    },
    {
      num: "2",
      titleEn: "Use pagination for large lists",
      titleKh: "ប្រើប្រាស់ការបែងចែកទំព័រ (Pagination) សម្រាប់បញ្ជីវែងៗ",
      descEn: "Limit database query results and use cursor-based pagination (Connections specification) or offset-limit filters to improve performance and prevent server timeouts.",
      descKh: "កំណត់ចំនួនលទ្ធផលនៃការសាកសួរ និងប្រើប្រាស់ការបែងចែកទំព័រផ្អែកលើ Cursor (សញ្ញាចង្អុល) ឬ Offset-Limit ដើម្បីបង្កើនល្បឿន និងបង្ការកុំឱ្យម៉ាស៊ីនមេគាំង (Timeout)។",
      badCode: `query {
  # Dangerous! Can crash the database if school has 10,000+ books
  allBooks {
    id
    title
  }
}`,
      goodCode: `query {
  # Professional cursor-based connection architecture
  books(first: 10, after: "cursor_token_abc") {
    edges {
      node {
        id
        title
      }
      cursor
    }
    pageInfo {
      hasNextPage
    }
  }
}`
    },
    {
      num: "3",
      titleEn: "Use variables instead of hardcoded values",
      titleKh: "ប្រើប្រាស់អថេរ (Variables) ជំនួសការសរសេរតម្លៃដោយផ្ទាល់",
      descEn: "Variables make GraphQL operations reusable, clean, and allow query caching in the compiler layer, preventing potential injection attacks.",
      descKh: "ការប្រើប្រាស់អថេរធ្វើឱ្យប្រតិបត្តិការ GraphQL អាចយកមកប្រើឡើងវិញបាន ស្អាត និងអនុញ្ញាតឱ្យមានការរក្សាទុកបណ្តោះអាសន្ន (Query Caching) នៅលើម៉ាស៊ីនមេ ព្រមទាំងការពារការវាយប្រហារបញ្ចូលកូដបង្កប់ (Injection Attacks)។",
      badCode: `mutation {
  # Bad: Hardcoded strings inside query body
  addBook(title: "GraphQL for Beginners", author: "Dr. Sopheak") {
    id
  }
}`,
      goodCode: `mutation AddNewBook($title: String!, $author: String!) {
  # Good: Uses variables passed alongside the body
  addBook(title: $title, author: $author) {
    id
  }
}`
    },
    {
      num: "4",
      titleEn: "Add authentication and authorization",
      titleKh: "បន្ថែមការផ្ទៀងផ្ទាត់អត្តសញ្ញាណ និងការផ្ដល់សិទ្ធិ (Auth)",
      descEn: "Protect your GraphQL endpoint by validating tokens (JWT) in the request context and checking user role rights inside resolver functions or schema directives.",
      descKh: "ការពារចំណុចតភ្ជាប់ GraphQL របស់អ្នកដោយពិនិត្យសុពលភាពថូខឹន (JWT) នៅក្នុង Request Context និងផ្ទៀងផ្ទាត់តួនាទីសិទ្ធិរបស់អ្នកប្រើប្រាស់ក្នុងមុខងារ Resolver។",
      badCode: `const resolvers = {
  Query: {
    // Bad: No safety checks, any visitor can delete books!
    deleteBook: (_, { id }) => db.deleteBook(id)
  }
}`,
      goodCode: `const resolvers = {
  Query: {
    // Good: Securely validates credentials inside resolver context
    deleteBook: (_, { id }, context) => {
      if (!context.currentUser) throw new Error("Unauthorized");
      if (context.currentUser.role !== 'admin') {
        throw new Error("Insufficient database privileges");
      }
      return db.deleteBook(id);
    }
  }
}`
    },
    {
      num: "5",
      titleEn: "Prevent N+1 with batching or DataLoader",
      titleKh: "បង្ការបញ្ហា N+1 ជាមួយការបូកបញ្ចូលគ្នា (DataLoader)",
      descEn: "When query requests relations (e.g. books nested inside students), standard execution hits the database N+1 times. Use DataLoader to batch and cache database reads.",
      descKh: "នៅពេលសួររកទំនាក់ទំនង (ដូចជាសៀវភៅដែលខ្ចីដោយសិស្ស) ប្រព័ន្ធនឹងដំណើរការសួរ DB ច្រើនដង (N+1)។ ប្រើប្រាស់បណ្ណាល័យ DataLoader ដើម្បីប្រមូលសំណួរមកសួរម្ដងគត់។",
      badCode: `const resolvers = {
  Student: {
    // Hits database once for EVERY single student in the list! (N+1 query)
    borrowRecords: (student) => db.getRecordsByStudentId(student.id)
  }
}`,
      goodCode: `const resolvers = {
  Student: {
    // Batches all queries into a single database SQL IN statement!
    borrowRecords: (student, _, context) => {
      return context.dataLoaders.recordsByStudent.load(student.id);
    }
  }
}`
    },
    {
      num: "6",
      titleEn: "Deprecate old fields carefully",
      titleKh: "លុបចោលវាលចាស់ៗដោយប្រុងប្រយ័ត្ន (Deprecate)",
      descEn: "Never break API contracts. Mark outdated fields with the @deprecated directive and communicate alternative fields clearly to developers.",
      descKh: "កុំលុបវាលចាស់ចោលភ្លាមៗដែលធ្វើឱ្យប្រព័ន្ធចាស់របស់អតិថិជនគាំង។ ប្រើប្រាស់សេចក្ដីណែនាំ @deprecated ដើម្បីជូនដំណឹងពីវាលជំនួសថ្មី។",
      badCode: `type Student {
  # Breaking change: Deleting this field immediately will crash mobile apps!
  # name: String (deleted)
  fullName: String
}`,
      goodCode: `type Student {
  name: String @deprecated(reason: "Use 'fullName' which supports Cambodian national sorting.")
  fullName: String!
}`
    },
    {
      num: "7",
      titleEn: "Use depth limits and query cost controls",
      titleKh: "ប្រើប្រាស់ការកំណត់ជម្រៅ និងការចំណាយរបស់សំណួរ (Query Cost)",
      descEn: "Malicious recursive circular queries can consume infinite CPU resources. Impose maximum depth limits and score-based query cost analysers on incoming queries.",
      descKh: "ការសរសេរសួរវិលជុំមិនចេះចប់អាចធ្វើឱ្យម៉ាស៊ីនមេគាំង (Infinite CPU loop)។ ត្រូវកំណត់កម្រិតជម្រៅសំណួរអតិបរមា (Depth Limits) និងពិនិត្យទំហំសំណួរមុនដំណើរការ។",
      badCode: `query MaliciousQuery {
  # Infinite cyclic relation query that crashes backend thread!
  students {
    borrowRecords {
      student {
        borrowRecords {
          student {
            name
          }
        }
      }
    }
  }
}`,
      goodCode: `// Configure cost analysis plugin inside server.ts setup
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  schema,
  validationRules: [ depthLimit(4) ] // Reject query if depth > 4!
});`
    },
    {
      num: "8",
      titleEn: "Document examples for developers",
      titleKh: "រៀបចំឯកសារគំរូសម្រាប់អ្នកអភិវឌ្ឍន៍ (Documentation)",
      descEn: "Use the built-in self-documenting power of GraphQL. Provide clear sandbox playgrounds (Apollo Studio, GraphiQL) preloaded with sample variables and queries.",
      descKh: "ទាញយកផលប្រយោជន៍ពីលក្ខណៈស្វ័យប្រវត្តនៃ GraphQL API។ បង្កើតទីធ្លាសាកល្បង (Playground) ដែលមានភ្ជាប់ជាមួយគំរូកូដច្បាស់លាស់។",
      badCode: `# Read the private word document to see how to request library books`,
      goodCode: `"""
Query root for Cambodian Educational Library Network
"""
type Query {
  """
  Retrieves a curated list of books matching filters
  """
  books(limit: Int): [Book!]!
}`
    }
  ];

  return (
    <div id="graphql-dev-hub-root" className="space-y-6">
      
      {/* Header Panel */}
      <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-white dark:from-slate-900/40 dark:to-slate-800/20 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-pink-500 text-white rounded-xl shadow-md animate-pulse">
              <Code className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              {text.title}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold max-w-2xl">
            {text.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700 shadow-xs self-start md:self-auto">
          <span className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-ping" />
          <span className="text-[10px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest font-mono">
            GRAPHQL ENGINE v4.2
          </span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap gap-2 bg-slate-100/80 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800 max-w-max">
        {[
          { id: 'sandbox', label: text.playgroundTab, icon: Terminal },
          { id: 'flow', label: text.flowTab, icon: Workflow },
          { id: 'schema', label: text.schemaTab, icon: Layers },
          { id: 'comparison', label: text.comparisonTab, icon: RefreshCw },
          { id: 'bestpractices', label: text.bestPracticesTab, icon: CheckCircle2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                isActive 
                  ? 'bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 shadow-xs border border-pink-500/20' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels with Slide-Fade Entry */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >

          {/* 1. PLAYGROUND TAB */}
          {activeTab === 'sandbox' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Left Column: Quick Templates & Variables */}
              <div className="xl:col-span-4 space-y-6">
                
                {/* Pre-configured templates */}
                <div className="glass-panel p-5 rounded-3xl border border-white/60 bg-white/80 dark:bg-slate-900/60 shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-500" />
                    {text.templatesTitle}
                  </h3>
                  <div className="space-y-2">
                    {queryTemplates.map((tpl, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleLoadTemplate(tpl)}
                        className="w-full text-left p-3 rounded-2xl bg-slate-50 hover:bg-pink-500/5 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800 transition duration-150 flex items-center justify-between group cursor-pointer"
                      >
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-pink-600 dark:group-hover:text-pink-400 line-clamp-1">
                          {language === 'kh' ? tpl.nameKh : tpl.nameEn}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-pink-500 transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Variables JSON editor */}
                <div className="glass-panel p-5 rounded-3xl border border-white/60 bg-white/80 dark:bg-slate-900/60 shadow-xs space-y-3">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-500" />
                    {text.variablesTitle}
                  </h3>
                  <textarea
                    value={queryVariables}
                    onChange={(e) => setQueryVariables(e.target.value)}
                    className="w-full h-32 p-3 font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-900 text-emerald-400 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500 scrollbar-thin"
                    placeholder="{}"
                  />
                </div>

                {/* Info Tip */}
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex gap-3 text-xs text-blue-700 dark:text-blue-300">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      {language === 'kh' ? 'ព័ត៌មានជំនួយ Sandbox' : 'Sandbox Tip'}
                    </p>
                    <p className="leading-relaxed opacity-90">
                      {language === 'kh' 
                        ? 'រាល់ការផ្លាស់ប្តូរទិន្នន័យ (ដូចជា AddBook) នឹងចូលទៅក្នុងប្រព័ន្ធទិន្នន័យពិតនៃកម្មវិធីរបស់អ្នកភ្លាមៗ!'
                        : 'Mutations entered here will modify the actual local state of the application. Test it and watch changes persist live.'}
                    </p>
                  </div>
                </div>

              </div>

              {/* Right Column: GraphQL Code Editor & Response */}
              <div className="xl:col-span-8 space-y-6">
                
                {/* Editor Panel */}
                <div className="glass-panel rounded-3xl border border-white/60 bg-white/80 dark:bg-slate-900/60 shadow-xs overflow-hidden">
                  
                  {/* Editor Header controls */}
                  <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-pink-500" />
                      <span className="text-xs font-black text-slate-300 font-mono tracking-widest uppercase">
                        GRAPHQL EDITOR
                      </span>
                    </div>

                    <button
                      onClick={handleExecuteGraphQL}
                      disabled={isExecuting}
                      className="px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:bg-slate-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition flex items-center gap-1.5"
                    >
                      {isExecuting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>{text.executeBtn}</span>
                    </button>
                  </div>

                  {/* Body Textarea with row count style */}
                  <div className="flex bg-slate-950">
                    {/* Fake line numbers */}
                    <div className="p-4 pr-2 text-right font-mono text-xs text-slate-600 select-none border-r border-slate-800 bg-slate-950/80">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <textarea
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      className="w-full h-72 p-4 font-mono text-xs text-slate-100 bg-transparent focus:outline-none focus:ring-0 resize-none overflow-y-auto scrollbar-thin"
                      spellCheck="false"
                    />
                  </div>
                </div>

                {/* Execution visual flow timeline (only visible when executing) */}
                {isExecuting && (
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md space-y-3">
                    <p className="text-[10px] font-black tracking-wider text-pink-500 uppercase font-mono">
                      Query Execution Timeline
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 1, label: language === 'kh' ? 'វិភាគកូដ (Parsing)' : 'Parse & Validate' },
                        { id: 2, label: language === 'kh' ? 'ហៅ Resolvers' : 'Resolve Fields' },
                        { id: 3, label: language === 'kh' ? 'សាកសួរ DB' : 'Fetch Database' },
                        { id: 4, label: language === 'kh' ? 'លទ្ធផលចម្លើយ' : 'Shape Response' }
                      ].map(step => (
                        <div 
                          key={step.id} 
                          className={`p-2.5 rounded-xl border text-center transition duration-300 ${
                            execStep === step.id 
                              ? 'bg-pink-500/20 border-pink-500 text-pink-400 font-bold scale-102' 
                              : execStep > step.id 
                                ? 'bg-slate-800 border-slate-700 text-slate-400' 
                                : 'bg-slate-950 border-slate-900 text-slate-700'
                          }`}
                        >
                          <div className="text-[9px] uppercase tracking-wider leading-relaxed">
                            {step.label}
                          </div>
                          {execStep === step.id && (
                            <span className="w-1.5 h-1.5 bg-pink-500 rounded-full inline-block animate-ping mt-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Response / JSON payload */}
                <div className="glass-panel rounded-3xl border border-white/60 bg-white/80 dark:bg-slate-900/60 shadow-xs overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-950 p-4 border-b border-slate-200/50 dark:border-slate-850 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-emerald-500" />
                      <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 tracking-wider">
                        {text.responseTitle}
                      </h4>
                    </div>

                    {queryResponse && (
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/10 uppercase font-mono">
                        STATUS 200 OK
                      </span>
                    )}
                  </div>

                  <div className="p-4 bg-slate-950 min-h-[160px] max-h-[400px] overflow-y-auto scrollbar-thin">
                    {sandboxError ? (
                      <div className="flex items-start gap-2 text-rose-500 font-mono text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <pre className="whitespace-pre-wrap">{sandboxError}</pre>
                      </div>
                    ) : queryResponse ? (
                      <pre className="text-emerald-400 font-mono text-xs whitespace-pre-wrap">
                        {formatJSON(queryResponse)}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-10">
                        <Terminal className="w-8 h-8 text-slate-600 animate-pulse" />
                        <p className="text-slate-500 font-semibold text-xs mt-2">
                          {language === 'kh' ? 'គ្មានប្រតិបត្តិការសកម្មទេ' : 'No active query payload'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-sm">
                          {language === 'kh' 
                            ? 'ចុចប៊ូតុង "ដំណើរការ Query" ដើម្បីមើលលទ្ធផល JSON ជាក់ស្តែង' 
                            : 'Click "Execute Operation" to trigger resolvers and retrieve the payload'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subscriptions stream */}
                {isSubscribed && (
                  <div className="glass-panel p-5 rounded-3xl border border-white/60 bg-white/80 dark:bg-slate-900/60 shadow-xs space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Rss className="w-4 h-4 text-orange-500 animate-pulse" />
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          {text.subTitle}
                        </h3>
                      </div>
                      <button
                        onClick={() => setIsSubscribed(false)}
                        className="text-[9px] font-black text-rose-500 hover:underline uppercase tracking-widest"
                      >
                        {language === 'kh' ? 'បិទការជាវ' : 'Unsubscribe'}
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-thin pr-1">
                      {subEvents.map((evt) => (
                        <div key={evt.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 flex justify-between items-start">
                          <div className="space-y-1">
                            <span className="text-[10px] text-orange-400 font-black">{evt.event}</span>
                            <pre className="text-[10px] text-emerald-400 mt-1">{formatJSON(evt.payload)}</pre>
                          </div>
                          <span className="text-[9px] text-slate-500 shrink-0">{evt.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* 2. RESOLVERS & FLOW TAB */}
          {activeTab === 'flow' && (
            <div className="glass-panel p-6 rounded-3xl border border-white/60 bg-white/80 dark:bg-slate-900/60 shadow-xs space-y-6">
              
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  {language === 'kh' ? 'របៀបដែល GraphQL ដំណើរការ (Resolvers & Data Flow)' : 'How GraphQL Resolvers & Data Flow Work'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                  {language === 'kh'
                    ? 'នៅពេលម៉ាស៊ីនភ្ញៀវផ្ញើសំណួរ (Query) ម៉ាស៊ីនមេ GraphQL នឹងមិនទាញទិន្នន័យទាំងអស់មកនោះទេ។ វាហៅមុខងារ "Resolvers" ដើម្បីទាញយកទិន្នន័យជាក់លាក់សម្រាប់ផ្នែកនីមួយៗពីមូលដ្ឋានទិន្នន័យ រួចបញ្ជូនទម្រង់ JSON ដែលស្អាត និងចំតម្រូវការត្រឡប់ទៅវិញ។'
                    : 'GraphQL separates the schema contract from data storage. Resolvers act as functions that map fields in a schema directly to backend databases, microservices, or APIs.'}
                </p>
              </div>

              {/* Graphical Step-by-Step flow mimicking Image 7 */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative pt-6">
                
                {/* Step 1 */}
                <div className="relative p-5 bg-blue-50/50 dark:bg-slate-950/40 border border-blue-100/50 dark:border-slate-800 rounded-2xl flex flex-col items-center text-center space-y-3 group hover:border-blue-300 transition">
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-black shadow-md">
                    1
                  </span>
                  <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
                    <Wifi className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wide">
                    {language === 'kh' ? 'ម៉ាស៊ីនភ្ញៀវផ្ញើសំណួរ' : 'Client Sends Query'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'kh'
                      ? 'Client ស្នើសុំតែវាល (Fields) ដែលវាត្រូវការប៉ុណ្ណោះ គ្មានការបន្ថែម ឬបន្ថយឡើយ។'
                      : 'The client issues a GraphQL document specifying the exact projection fields (e.g., id, title).'}
                  </p>
                </div>

                {/* Step 2 */}
                <div className="relative p-5 bg-purple-50/50 dark:bg-slate-950/40 border border-purple-100/50 dark:border-slate-800 rounded-2xl flex flex-col items-center text-center space-y-3 group hover:border-purple-300 transition">
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-black shadow-md">
                    2
                  </span>
                  <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl">
                    <Server className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wide">
                    {language === 'kh' ? 'ម៉ាស៊ីនមេវិភាគកូដ' : 'GraphQL Server Parses'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'kh'
                      ? 'Server ត្រួតពិនិត្យភាពត្រឹមត្រូវនៃល្បះ និងផ្ទៀងផ្ទាត់ជាមួយ Schema Contract។'
                      : 'The server parses the query into an Abstract Syntax Tree (AST) and validates it against the schema.'}
                  </p>
                </div>

                {/* Step 3 */}
                <div className="relative p-5 bg-pink-50/50 dark:bg-slate-950/40 border border-pink-100/50 dark:border-slate-800 rounded-2xl flex flex-col items-center text-center space-y-3 group hover:border-pink-300 transition">
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-black shadow-md">
                    3
                  </span>
                  <div className="p-3 bg-pink-500/10 text-pink-600 rounded-2xl">
                    <Database className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wide">
                    {language === 'kh' ? 'Resolvers ដំណើរការ DB' : 'Resolvers Call DB'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'kh'
                      ? 'Resolvers ដំណើរការទាញទិន្នន័យពី DB (SQL/MySQL) ឬសេវាកម្ម REST ផ្សេងៗ។'
                      : 'Resolvers connect the fields to internal databases (e.g., MySQL, Firestore) or REST microservices.'}
                  </p>
                </div>

                {/* Step 4 */}
                <div className="relative p-5 bg-emerald-50/50 dark:bg-slate-950/40 border border-emerald-100/50 dark:border-slate-800 rounded-2xl flex flex-col items-center text-center space-y-3 group hover:border-emerald-300 transition">
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-md">
                    4
                  </span>
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                    <FileJson className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wide">
                    {language === 'kh' ? 'ចម្លើយតាមទ្រង់ទ្រាយ JSON' : 'JSON Response Delivery'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'kh'
                      ? 'ម៉ាស៊ីនមេរៀបចំទិន្នន័យតាមទម្រង់ដែលចង់បាន និងបញ្ជូនចម្លើយ JSON ភ្លាមៗ។'
                      : 'The server structures the fetched elements into a clean nested JSON match payload.'}
                  </p>
                </div>

              </div>

              {/* Graphic Flowchart Visualization */}
              <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden min-h-[250px] relative">
                
                {/* Connections Animation Canvas */}
                <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-2xl gap-8 relative z-10 py-4">
                  
                  {/* Client Node */}
                  <div className="p-4 bg-blue-600 border border-blue-400 rounded-xl text-center text-white font-mono space-y-1 shadow-md w-36 shrink-0">
                    <span className="text-[10px] font-black uppercase">CLIENT</span>
                    <p className="text-[9px] opacity-90 truncate font-mono">browser / iOS</p>
                  </div>

                  {/* Arrow 1 */}
                  <div className="flex flex-col items-center justify-center text-slate-500 text-xs shrink-0 font-mono">
                    <span className="animate-pulse">query {'{'} books {'}'}</span>
                    <ArrowRight className="w-5 h-5 text-slate-400 hidden md:block" />
                  </div>

                  {/* GraphQL Server Engine Node */}
                  <div className="p-5 bg-pink-600 border border-pink-400 rounded-xl text-center text-white font-mono space-y-1 shadow-md w-44 shrink-0 relative">
                    <span className="text-[10px] font-black uppercase">GRAPHQL SERVER</span>
                    <p className="text-[9px] opacity-90 truncate font-mono">Resolvers execution</p>
                    <span className="absolute -bottom-2 -right-2 bg-slate-900 text-emerald-400 border border-slate-700 rounded px-1 text-[8px]">
                      Router
                    </span>
                  </div>

                  {/* Arrow 2 */}
                  <div className="flex flex-col items-center justify-center text-slate-500 text-xs shrink-0 font-mono">
                    <span>SQL / ORM</span>
                    <ArrowRight className="w-5 h-5 text-slate-400 hidden md:block" />
                  </div>

                  {/* Databases Node */}
                  <div className="p-4 bg-emerald-600 border border-emerald-400 rounded-xl text-center text-white font-mono space-y-1 shadow-md w-36 shrink-0">
                    <span className="text-[10px] font-black uppercase">DATABASE</span>
                    <p className="text-[9px] opacity-90 truncate font-mono">MySQL / Cloud DB</p>
                  </div>

                </div>

                <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950 opacity-40 pointer-events-none" />
              </div>

            </div>
          )}

          {/* 3. SCHEMA & TYPES TAB */}
          {activeTab === 'schema' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Left Column: Core Types definitions */}
              <div className="xl:col-span-4 space-y-6">
                <div className="glass-panel p-5 rounded-3xl border border-white/60 bg-white/80 dark:bg-slate-900/60 shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-pink-500" />
                    GraphQL Scalars Reference
                  </h3>

                  <div className="space-y-3">
                    {[
                      { name: 'ID', desc: 'Unique identifier used for caching and database retrieval.', type: 'Scalar' },
                      { name: 'String', desc: 'UTF-8 character sequence. Used for titles, names, descriptions.', type: 'Scalar' },
                      { name: 'Int', desc: 'Signed 32-bit integer. Used for publish years, counts.', type: 'Scalar' },
                      { name: 'Float', desc: 'Double-precision fractional values. Used for prices or coordinates.', type: 'Scalar' },
                      { name: 'Boolean', desc: 'Standard true or false state indicators.', type: 'Scalar' }
                    ].map((scalar, i) => (
                      <div key={i} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs font-black text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 px-2 py-0.5 rounded-md">
                            {scalar.name}
                          </span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                            {scalar.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                          {scalar.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Schema registry definition */}
              <div className="xl:col-span-8 space-y-6">
                <div className="glass-panel p-6 rounded-3xl border border-white/60 bg-white/80 dark:bg-slate-900/60 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-pink-500" />
                        School Library Schema Definition (SDL)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {language === 'kh' 
                          ? 'កិច្ចសន្យាជាសកលរវាងម៉ាស៊ីនភ្ញៀវ និងម៉ាស៊ីនមេបណ្ណាល័យវិទ្យាល័យ អណ្តូងមាស' 
                          : 'The strictly typed contract governing Andoung Meas HS Library database exchanges'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900 font-mono text-xs text-slate-300 max-h-[460px] overflow-y-auto scrollbar-thin">
                    <pre className="whitespace-pre-wrap">{`"""
Represents a literary volume catalogued within our collection.
"""
type Book {
  id: ID!
  title: String!
  barcode: String!
  author: String!
  publishYear: Int!
  status: BookStatus!
}

enum BookStatus {
  AVAILABLE
  BORROWED
  OVERDUE
  LOST
}

"""
Represents an authorized patron of the high school library.
"""
type Student {
  id: ID!
  studentId: String!
  name: String!
  gender: Gender!
  classGrade: String!
  phoneNumber: String!
}

enum Gender {
  MALE
  FEMALE
}

"""
Active borrow/return transaction records ledger.
"""
type BorrowRecord {
  id: ID!
  bookId: ID!
  studentId: ID!
  borrowDate: String!
  dueDate: String!
  returnDate: String
  status: BorrowStatus!
}

type Query {
  books(limit: Int): [Book!]!
  student(id: ID!): Student
  records: [BorrowRecord!]!
}

type Mutation {
  addBook(title: String!, author: String!, barcode: String!, categoryId: ID!): Book!
  returnBook(id: ID!): BorrowRecord!
}

type Subscription {
  bookBorrowed: BorrowRecord!
}`}</pre>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 4. REST vs GRAPHQL TAB */}
          {activeTab === 'comparison' && (
            <div className="glass-panel p-6 rounded-3xl border border-white/60 bg-white/80 dark:bg-slate-900/60 shadow-xs space-y-6">
              
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  {text.overfetchingTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                  {language === 'kh'
                    ? 'ក្នុង REST API ម៉ាស៊ីនមេបញ្ជូនសំណុំទិន្នន័យចាស់ដែលគ្មានការប្រែប្រួលមកវិញ (Over-fetching) ដែលខ្ជះខ្ជាយអ៊ីនធឺណិត។ ផ្ទុយទៅវិញ GraphQL អនុញ្ញាតឱ្យអ្នករើសវាលដែលចង់បាន ដើម្បីកាត់បន្ថយទំហំសំណុំទិន្នន័យមកតូចបំផុត។'
                    : 'A key advantage of GraphQL over REST is the prevention of over-fetching. REST endpoints return fixed, monolithic JSON structures, whereas GraphQL clients query for only what they need, saving bandwidth.'}
                </p>
              </div>

              {/* Interactive over-fetching calculator */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                
                {/* REST Endpoint representation (Fixed) */}
                <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest font-mono">
                      REST: GET /api/books
                    </span>
                    <span className="text-xs font-mono text-red-500 font-bold">
                      Fixed Payload Size: {restPayloadSize} bytes
                    </span>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-900 font-mono text-[10px] text-slate-400">
                    <pre>{`{
  "id": "b-12345",
  "title": "Structure and Interpretation of Computer Programs",
  "barcode": "9780262510875",
  "author": "Harold Abelson",
  "publishYear": 1996,
  "status": "available",
  "location": "Shelf C-2",
  "addedDate": "2026-01-01",
  "categoryId": "CAT-SCI"
}`}</pre>
                  </div>
                  <p className="text-[10px] text-red-500 font-semibold italic">
                    {language === 'kh' ? '⚠️ Client តែងតែទទួលបានទិន្នន័យទាំង ៩ វាលនេះជានិច្ច ទោះបីត្រូវការតែចំណងជើងក្ដី។' : '⚠️ Server sends all 9 properties regardless of user interface requirement.'}
                  </p>
                </div>

                {/* GraphQL interactive projection */}
                <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest font-mono">
                        GraphQL: query {'{'} books {'}'}
                      </span>
                      <span className="text-xs font-mono text-emerald-500 font-bold">
                        Dynamic Size: {estimatedGqlSize} bytes
                      </span>
                    </div>

                    {/* Field Checkboxes */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                        Select Fields needed for your UI:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableFields.map(field => {
                          const isSelected = selectedRestFields.includes(field);
                          return (
                            <button
                              key={field}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedRestFields(selectedRestFields.filter(f => f !== field));
                                } else {
                                  setSelectedRestFields([...selectedRestFields, field]);
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer border ${
                                isSelected 
                                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-xs' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 border-transparent'
                              }`}
                            >
                              {field}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-900 font-mono text-[10px] text-emerald-400">
                      <pre>{`{
  "data": {
    "books": [
      {
${selectedRestFields.map(f => `        "${f}": ...`).join(',\n')}
      }
    ]
  }
}`}</pre>
                    </div>
                  </div>

                  {/* Savings Calculator Widget */}
                  <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        {text.savingsText}
                      </p>
                      <p className="text-lg font-black text-slate-800 dark:text-emerald-400 font-mono">
                        {bandwidthSavings}% SAVED
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin flex items-center justify-center text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0 font-mono">
                      {bandwidthSavings}%
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* 5. BEST PRACTICES TAB */}
          {activeTab === 'bestpractices' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Left Column: Practices list */}
              <div className="xl:col-span-5 space-y-3">
                <div className="glass-panel p-5 rounded-3xl border border-white/60 bg-white/80 dark:bg-slate-900/60 shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-pink-500" />
                    GraphQL Best Practices List
                  </h3>

                  <div className="space-y-1">
                    {practices.map((practice, index) => {
                      const isSelected = selectedPractice === index;
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedPractice(index)}
                          className={`w-full text-left p-3 rounded-2xl transition duration-150 flex items-center justify-between border cursor-pointer ${
                            isSelected 
                              ? 'bg-pink-500/10 border-pink-500/40 text-pink-600 dark:text-pink-400 font-black' 
                              : 'bg-slate-50 dark:bg-slate-800/40 border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                              isSelected ? 'bg-pink-500 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {practice.num}
                            </span>
                            <span className="text-xs font-black line-clamp-1">
                              {language === 'kh' ? practice.titleKh : practice.titleEn}
                            </span>
                          </div>
                          <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'translate-x-1 text-pink-500' : 'text-slate-400'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Code Explanation Detail */}
              <div className="xl:col-span-7 space-y-6">
                <div className="glass-panel p-6 rounded-3xl border border-white/60 bg-white/80 dark:bg-slate-900/60 shadow-xs space-y-4">
                  
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 px-2.5 py-0.5 rounded-full border border-pink-500/10 uppercase font-mono">
                      BEST PRACTICE PRINCIPLE #{practices[selectedPractice].num}
                    </span>
                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                      {language === 'kh' ? practices[selectedPractice].titleKh : practices[selectedPractice].titleEn}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      {language === 'kh' ? practices[selectedPractice].descKh : practices[selectedPractice].descEn}
                    </p>
                  </div>

                  {/* Bad vs Good Code visual comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    
                    {/* Bad example */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-red-500 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded border border-red-500/10 uppercase tracking-wider block text-center font-mono">
                        ❌ AVOID / BAD IMPLEMENTATION
                      </span>
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 font-mono text-[10px] text-rose-400 max-h-[220px] overflow-y-auto scrollbar-thin">
                        <pre>{practices[selectedPractice].badCode}</pre>
                      </div>
                    </div>

                    {/* Good example */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/10 uppercase tracking-wider block text-center font-mono">
                        ✅ RECOMMENDED / GOOD PRACTICE
                      </span>
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 font-mono text-[10px] text-emerald-400 max-h-[220px] overflow-y-auto scrollbar-thin">
                        <pre>{practices[selectedPractice].goodCode}</pre>
                      </div>
                    </div>

                  </div>

                </div>
              </div>

            </div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
}
