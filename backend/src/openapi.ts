const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'LAVA API',
    version: '1.0.0',
    description:
      'LAVA (Land & Asset Valuation Assistant) REST API. Surveyors submit property records, officers and admins verify them, and the AI assistant provides valuation guidance. Auth is via JWT bearer tokens returned by `POST /api/auth/login` or `/api/auth/register`.\n\nProtected endpoints are marked with a lock and require the `Authorization: Bearer <token>` header.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Auth', description: 'Registration, login and profile management' },
    { name: 'Submissions', description: 'Property records submitted by surveyors' },
    { name: 'Notifications', description: 'In-app notifications for submission owners' },
    { name: 'Audit', description: 'Admin audit trail of verification actions' },
    { name: 'Knowledge Base', description: 'Documents used by the AI assistant' },
    { name: 'AI Assistant', description: 'Claude-powered valuation assistant' },
    { name: 'Settings', description: 'Admin application settings' },
    { name: 'System', description: 'Health check' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: { error: { type: 'string', example: 'Invalid credentials' } },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'surveyor-001' },
          name: { type: 'string', example: 'Kofi Mensah' },
          email: { type: 'string', example: 'kofi@survey.gh' },
          licence_number: { type: 'string', nullable: true, example: 'GHIS/VS/0042' },
          organisation: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['public', 'surveyor', 'officer', 'admin'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        required: ['token', 'user'],
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['password'],
        properties: {
          email: { type: 'string', example: 'kofi@survey.gh' },
          licence_number: { type: 'string', example: 'GHIS/VS/0042' },
          password: { type: 'string', example: 'lava2025' },
        },
        description: 'Provide `email` OR `licence_number`, plus `password`.',
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Kofi Mensah' },
          email: { type: 'string', example: 'kofi@survey.gh' },
          password: { type: 'string', format: 'password', minLength: 8, example: 'lava2025' },
          licence_number: { type: 'string', description: 'If provided, account is created as a surveyor' },
          organisation: { type: 'string' },
        },
      },
      ProfileUpdateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          licence_number: { type: 'string', nullable: true },
          organisation: { type: 'string', nullable: true },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['current_password', 'new_password'],
        properties: {
          current_password: { type: 'string', format: 'password' },
          new_password: { type: 'string', format: 'password', minLength: 8 },
        },
      },
      Submission: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '9b09aa6d-2383-4ab0-9137-a602337e048e' },
          property_type: { type: 'string', enum: ['Land', 'Developed'] },
          region: { type: 'string', example: 'Greater Accra' },
          district: { type: 'string' },
          community: { type: 'string' },
          gps_coordinates: { type: 'string', example: '05.6100, -00.1930' },
          land_size: { type: 'number', nullable: true },
          unit: { type: 'string', example: 'Acres' },
          land_use: { type: 'string', example: 'Residential' },
          tenure_type: { type: 'string', example: 'Freehold' },
          description: { type: 'string' },
          bedrooms: { type: 'number', nullable: true },
          bathrooms: { type: 'number', nullable: true },
          storeys: { type: 'number', nullable: true },
          floor_area: { type: 'number', nullable: true },
          building_age: { type: 'number', nullable: true },
          condition: { type: 'string', nullable: true },
          transaction_type: { type: 'string', example: 'Sale' },
          price: { type: 'number', example: 850000 },
          transaction_date: { type: 'string', format: 'date', nullable: true },
          source: { type: 'string' },
          surveyor_name: { type: 'string' },
          licence_number: { type: 'string' },
          organisation: { type: 'string' },
          email: { type: 'string' },
          status: { type: 'string', enum: ['Pending', 'Verified', 'Flagged', 'Rejected'], example: 'Pending' },
          trust_score: { type: 'string', enum: ['High', 'Medium', 'Low'], example: 'Medium' },
          user_id: { type: 'string', nullable: true },
          submitted_at: { type: 'string', format: 'date-time' },
          verified_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      SubmissionUpdateRequest: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['Pending', 'Verified', 'Flagged', 'Rejected'], example: 'Verified' },
          trust_score: { type: 'string', enum: ['High', 'Medium', 'Low'], example: 'High' },
        },
        description:
          'Changing `status` writes an audit-log entry and notifies the submission owner. Changing `trust_score` writes an audit-log entry.',
      },
      Stats: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 2093 },
          verified: { type: 'integer' },
          pending: { type: 'integer' },
          flagged: { type: 'integer' },
          rejected: { type: 'integer' },
          regions: { type: 'integer' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          user_id: { type: 'string' },
          type: { type: 'string', example: 'submission_verified' },
          title: { type: 'string', example: 'Submission verified' },
          message: { type: 'string', example: 'Your submission in Community, District was verified.' },
          target_id: { type: 'string', nullable: true },
          read: { type: 'boolean', example: false },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      NotificationsResponse: {
        type: 'object',
        required: ['notifications', 'unread'],
        properties: {
          notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
          unread: { type: 'integer', example: 2 },
        },
      },
      MarkReadRequest: {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'string' }, description: 'Omit to mark all as read.' },
        },
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          actor_id: { type: 'string', nullable: true },
          actor_name: { type: 'string', example: 'Ama Serwaa' },
          action: { type: 'string', example: 'submission_Verified' },
          target_type: { type: 'string', default: 'submission' },
          target_id: { type: 'string', nullable: true },
          details: {
            type: 'object',
            nullable: true,
            example: { oldStatus: 'Pending', newStatus: 'Verified', oldTrust: 'Medium', newTrust: 'High' },
          },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      KnowledgeDoc: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['builtin', 'uploaded'] },
          word_count: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      UploadDocRequest: {
        type: 'object',
        required: ['name', 'content'],
        properties: {
          name: { type: 'string', example: 'Stamp_Duty_Notes.pdf' },
          content: { type: 'string', example: 'Full text content of the document…' },
        },
      },
      ChatMessage: {
        type: 'object',
        required: ['role', 'content'],
        properties: {
          role: { type: 'string', enum: ['user', 'assistant'] },
          content: {
            oneOf: [
              { type: 'string', example: 'What is the stamp duty on a GHS 250,000 sale?' },
              {
                type: 'array',
                items: { type: 'object', properties: { type: { type: 'string' }, text: { type: 'string' } } },
              },
            ],
          },
        },
      },
      ChatRequest: {
        type: 'object',
        required: ['messages'],
        properties: {
          messages: { type: 'array', items: { $ref: '#/components/schemas/ChatMessage' } },
          isPublic: { type: 'boolean', description: 'Hint that shortens responses for guests.' },
        },
      },
      ChatHistoryResponse: {
        type: 'object',
        properties: { messages: { type: 'array', items: { $ref: '#/components/schemas/ChatMessage' } } },
      },
      AIStatusResponse: {
        type: 'object',
        properties: { verifiedRecords: { type: 'integer' } },
      },
      SettingsMap: {
        type: 'object',
        additionalProperties: { type: 'string' },
        example: { claude_api_key: 'sk-ant-…', default_currency: 'GHS' },
      },
      Success: {
        type: 'object',
        properties: { success: { type: 'boolean', example: true } },
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          version: { type: 'string', example: '1.0.0' },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account',
        description: 'Passwords must be at least 8 characters. Including a `licence_number` creates a surveyor account.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
        },
        responses: {
          '200': {
            description: 'Account created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          '400': { description: 'Missing fields or short password', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '409': { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        description: 'Returns a JWT (7-day expiry). Rate limited to 10 attempts per 15 minutes.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': {
            description: 'Logged in',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          '400': { description: 'Missing credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '429': { description: 'Too many attempts', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile',
            content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } },
          },
          '401': { description: 'Missing or invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/profile': {
      patch: {
        tags: ['Auth'],
        summary: 'Update profile',
        description: 'Adding a `licence_number` to a public account promotes it to surveyor.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProfileUpdateRequest' } } },
        },
        responses: {
          '200': {
            description: 'Updated profile',
            content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } },
          },
          '400': { description: 'Invalid input or nothing to update', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '409': { description: 'Email already in use', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } } },
        },
        responses: {
          '200': { description: 'Password changed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
          '400': { description: 'Missing fields or short new password', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Current password is incorrect', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/submissions': {
      get: {
        tags: ['Submissions'],
        summary: 'List submissions',
        description: 'Public read access. Filter by `status`, paginate with `limit`/`offset`.',
        parameters: [
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['all', 'Pending', 'Verified', 'Flagged', 'Rejected'] } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'List of submissions, newest first',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Submission' } } } },
          },
        },
      },
      post: {
        tags: ['Submissions'],
        summary: 'Create a submission',
        description: 'Any signed-in user (public, surveyor, officer or admin) can submit. Owner and surveyor identity are taken from the token, not the body. New submissions start as `Pending` / `Medium`.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Submission' } } },
        },
        responses: {
          '201': {
            description: 'Submission created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Submission' } } },
          },
          '400': { description: 'Invalid payload', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/submissions/stats': {
      get: {
        tags: ['Submissions'],
        summary: 'Dashboard metrics',
        description: 'Counts by status plus number of distinct regions.',
        responses: {
          '200': {
            description: 'Aggregate stats',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Stats' } } },
          },
        },
      },
    },
    '/api/submissions/{id}': {
      patch: {
        tags: ['Submissions'],
        summary: 'Verify / update a submission',
        description:
          'Officer or admin only. Changing `status` writes an audit-log entry and notifies the owner (if the submission has a `user_id`). Setting status to `Verified` also records `verified_at`.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Submission UUID or ID' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SubmissionUpdateRequest' } } },
        },
        responses: {
          '200': {
            description: 'Updated submission',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Submission' } } },
          },
          '400': { description: 'Invalid status/trust score or nothing to update', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Requires officer or admin role', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Submission not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List my notifications',
        description: 'Latest 50 notifications for the signed-in user, plus an unread count.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Notifications',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/NotificationsResponse' } } },
          },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/notifications/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark notifications as read',
        description: 'Pass `ids` to mark specific notifications, or omit the body to mark all as read.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MarkReadRequest' } } },
        },
        responses: {
          '200': { description: 'Marked as read', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/audit': {
      get: {
        tags: ['Audit'],
        summary: 'Audit trail',
        description:
          'Latest 100 audit-log entries — verification changes, role changes and sign-ins (successful and failed), each with an actor and timestamp. Admin only. Entries older than 5 days are pruned automatically.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Audit log entries, newest first',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } } } },
          },
          '403': { description: 'Admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users',
        description: 'All users (passwords excluded), newest first. Admin only.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { users: { type: 'array', items: { $ref: '#/components/schemas/User' } } },
                },
              },
            },
          },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/admin/users/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Change a user role',
        description:
          'Admin only. Used to promote a surveyor to verifier (`role: "officer"`) or demote back (`role: "surveyor"`). Admin cannot change their own role. Writes an audit-log entry.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: { role: { type: 'string', enum: ['public', 'surveyor', 'officer', 'admin'] } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          '400': { description: 'Invalid role or own role change', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/knowledge-base': {
      get: {
        tags: ['Knowledge Base'],
        summary: 'List documents',
        description: 'Metadata only (id, name, type, word count) — not the full content.',
        responses: {
          '200': {
            description: 'Documents',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/KnowledgeDoc' } } } },
          },
        },
      },
      post: {
        tags: ['Knowledge Base'],
        summary: 'Upload a document',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UploadDocRequest' } } },
        },
        responses: {
          '201': {
            description: 'Document uploaded',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/KnowledgeDoc' } } },
          },
          '400': { description: 'Missing name or content', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/knowledge-base/{id}': {
      get: {
        tags: ['Knowledge Base'],
        summary: 'Get a document with full content',
        description: 'Returns the document including its `content` field (used for editing). Admin only.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Document with content',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/KnowledgeDoc' },
                    { type: 'object', properties: { content: { type: 'string' } } },
                  ],
                },
              },
            },
          },
          '403': { description: 'Admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Document not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      patch: {
        tags: ['Knowledge Base'],
        summary: 'Update a document',
        description: 'Rename an uploaded document and/or replace its content (word count is recomputed). Built-in documents cannot be edited.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Stamp_Duty_Notes_2024.pdf' },
                  content: { type: 'string', example: 'Updated full text content…' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated document',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/KnowledgeDoc' } } },
          },
          '400': { description: 'Empty name or nothing to update', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Uploaded document not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Knowledge Base'],
        summary: 'Delete an uploaded document',
        description: 'Built-in documents cannot be deleted.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
          '403': { description: 'Admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Uploaded document not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/ai/status': {
      get: {
        tags: ['AI Assistant'],
        summary: 'AI feature status',
        responses: {
          '200': {
            description: 'Status',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AIStatusResponse' } } },
          },
        },
      },
    },
    '/api/ai/chat': {
      post: {
        tags: ['AI Assistant'],
        summary: 'Chat with the assistant',
        description:
          'Optional auth — guests get briefer responses and no persistence; signed-in users get full analysis and their messages are stored. Requires a Claude API key to be configured in settings. Rate limited to 90 requests per 15 minutes.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ChatRequest' } } },
        },
        responses: {
          '200': {
            description: 'Anthropic Chat API response',
            content: {
              'application/json': { schema: { type: 'object', description: 'Anthropic Messages API response body.' } },
            },
          },
          '400': { description: 'Claude API key not configured', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '502': { description: 'Upstream Claude API error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '429': { description: 'Rate limit exceeded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/ai/history': {
      get: {
        tags: ['AI Assistant'],
        summary: 'Chat history',
        description: 'Last 100 messages for the signed-in user (older than 90 days are pruned).',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Messages in chronological order',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ChatHistoryResponse' } } },
          },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['AI Assistant'],
        summary: 'Clear chat history',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'History cleared', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Get settings',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Key/value settings',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SettingsMap' } } },
          },
          '403': { description: 'Admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        tags: ['Settings'],
        summary: 'Update settings',
        description: 'Merges the supplied key/value pairs (e.g. `claude_api_key`).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SettingsMap' } } },
        },
        responses: {
          '200': { description: 'Settings saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
          '403': { description: 'Admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
}

export default openapi
