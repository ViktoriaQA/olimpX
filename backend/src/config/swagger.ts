import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CodeArena Backend API',
      version: '1.0.0',
      description: 'Backend API for CodeArena programming tournament platform built with Node.js, Express, and Supabase.',
      contact: {
        name: 'CodeArena Team',
        email: 'support@codearena.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://olimpxx.pp.ua',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from Supabase authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID from Supabase'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email'
            },
            nickname: {
              type: 'string',
              description: 'User nickname'
            },
            role: {
              type: 'string',
              enum: ['student', 'trainer', 'admin'],
              description: 'User role'
            },
            subscription_status: {
              type: 'string',
              enum: ['active', 'inactive', 'expired'],
              description: 'Subscription status'
            },
            subscription_expires_at: {
              type: 'string',
              format: 'date-time',
              description: 'Subscription expiry date'
            },
            avatar_url: {
              type: 'string',
              format: 'uri',
              description: 'Avatar URL'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date'
            }
          }
        },
        SubscriptionPlan: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Plan ID'
            },
            name: {
              type: 'string',
              description: 'Plan name'
            },
            description: {
              type: 'string',
              description: 'Plan description'
            },
            price: {
              type: 'number',
              format: 'float',
              description: 'Plan price'
            },
            currency: {
              type: 'string',
              description: 'Currency code'
            },
            billing_period: {
              type: 'string',
              enum: ['month', 'year'],
              description: 'Billing period'
            },
            features: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of features'
            },
            is_active: {
              type: 'boolean',
              description: 'Whether the plan is active'
            }
          }
        },
        Tournament: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Tournament ID'
            },
            title: {
              type: 'string',
              description: 'Tournament title'
            },
            description: {
              type: 'string',
              description: 'Tournament description'
            },
            start_time: {
              type: 'string',
              format: 'date-time',
              description: 'Tournament start time'
            },
            end_time: {
              type: 'string',
              format: 'date-time',
              description: 'Tournament end time'
            },
            status: {
              type: 'string',
              enum: ['upcoming', 'active', 'completed', 'cancelled'],
              description: 'Tournament status'
            },
            max_participants: {
              type: 'integer',
              description: 'Maximum number of participants'
            },
            current_participants: {
              type: 'integer',
              description: 'Current number of participants'
            },
            prize_pool: {
              type: 'number',
              format: 'float',
              description: 'Prize pool amount'
            }
          }
        },
        Task: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Task ID'
            },
            title: {
              type: 'string',
              description: 'Task title'
            },
            description: {
              type: 'string',
              description: 'Task description'
            },
            difficulty: {
              type: 'string',
              enum: ['easy', 'medium', 'hard'],
              description: 'Task difficulty'
            },
            category: {
              type: 'string',
              description: 'Task category'
            },
            time_limit: {
              type: 'integer',
              description: 'Time limit in seconds'
            },
            memory_limit: {
              type: 'integer',
              description: 'Memory limit in bytes'
            },
            points: {
              type: 'integer',
              description: 'Points awarded for completion'
            },
            languages: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Supported programming languages'
            }
          }
        },
        CodeExecutionRequest: {
          type: 'object',
          required: ['language', 'code'],
          properties: {
            language: {
              type: 'string',
              enum: ['python', 'javascript', 'typescript', 'go'],
              description: 'Programming language'
            },
            code: {
              type: 'string',
              maxLength: 50000,
              description: 'Code to execute'
            },
            stdin: {
              type: 'string',
              maxLength: 10000,
              description: 'Standard input for the code'
            },
            time_limit: {
              type: 'integer',
              minimum: 100,
              maximum: 60000,
              description: 'Time limit in milliseconds'
            },
            memory_limit: {
              type: 'integer',
              minimum: 1048576,
              maximum: 1073741824,
              description: 'Memory limit in bytes'
            }
          }
        },
        CodeExecutionResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether execution was successful'
            },
            data: {
              type: 'object',
              properties: {
                language: {
                  type: 'string',
                  description: 'Programming language'
                },
                version: {
                  type: 'string',
                  description: 'Language version'
                },
                output: {
                  type: 'object',
                  properties: {
                    stdout: {
                      type: 'string',
                      description: 'Standard output'
                    },
                    stderr: {
                      type: 'string',
                      description: 'Standard error'
                    },
                    exit_code: {
                      type: 'integer',
                      description: 'Exit code'
                    },
                    time: {
                      type: 'number',
                      description: 'Execution time in seconds'
                    },
                    memory: {
                      type: 'integer',
                      description: 'Memory used in bytes'
                    }
                  }
                },
                execution_time_ms: {
                  type: 'integer',
                  description: 'Total execution time in milliseconds'
                },
                memory_used_mb: {
                  type: 'integer',
                  description: 'Memory used in megabytes'
                },
                status: {
                  type: 'string',
                  description: 'Execution status'
                },
                service: {
                  type: 'string',
                  description: 'Service used for execution'
                }
              }
            },
            message: {
              type: 'string',
              description: 'Response message'
            }
          }
        },
        PaymentRequest: {
          type: 'object',
          required: ['package_id'],
          properties: {
            package_id: {
              type: 'string',
              description: 'Subscription package ID'
            },
            success_url: {
              type: 'string',
              format: 'uri',
              description: 'URL to redirect on successful payment'
            },
            failure_url: {
              type: 'string',
              format: 'uri',
              description: 'URL to redirect on failed payment'
            }
          }
        },
        PaymentResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether payment initiation was successful'
            },
            data: {
              type: 'object',
              properties: {
                order_id: {
                  type: 'string',
                  description: 'Unique order ID'
                },
                checkout_url: {
                  type: 'string',
                  format: 'uri',
                  description: 'Payment checkout URL'
                },
                amount: {
                  type: 'number',
                  format: 'float',
                  description: 'Payment amount'
                },
                currency: {
                  type: 'string',
                  description: 'Currency code'
                }
              }
            },
            message: {
              type: 'string',
              description: 'Response message'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Error description'
                },
                stack: {
                  type: 'string',
                  description: 'Error stack trace (development only)'
                }
              }
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Response data'
            },
            message: {
              type: 'string',
              description: 'Response message'
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  description: 'Current page'
                },
                limit: {
                  type: 'integer',
                  description: 'Items per page'
                },
                total: {
                  type: 'integer',
                  description: 'Total items'
                },
                totalPages: {
                  type: 'integer',
                  description: 'Total pages'
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Paths to files containing OpenAPI definitions
};

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi };
