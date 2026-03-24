export const testUsers = {
  regularUser: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
    role: 'user'
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    name: 'Admin User',
    role: 'admin'
  },
  newUser: {
    email: 'newuser@example.com',
    password: 'NewUserPassword123!',
    name: 'New User',
    role: 'user'
  }
};

export const tournamentData = {
  validTournament: {
    title: 'Test Tournament',
    description: 'This is a test tournament for E2E testing',
    startDate: '2024-12-01',
    endDate: '2024-12-31',
    maxParticipants: 100,
    difficulty: 'medium',
    category: 'algorithms'
  },
  invalidTournament: {
    title: '',
    description: '',
    startDate: 'invalid-date',
    endDate: 'invalid-date',
    maxParticipants: -1,
    difficulty: 'invalid',
    category: 'invalid'
  }
};

export const taskData = {
  validTask: {
    title: 'Test Task',
    description: 'This is a test task for E2E testing',
    difficulty: 'easy',
    category: 'algorithms',
    timeLimit: 1000,
    memoryLimit: 256,
    inputFormat: 'Standard input',
    outputFormat: 'Standard output',
    examples: [
      {
        input: '5\n3 7\n',
        output: '10\n'
      }
    ],
    solution: 'def solve():\n    a, b = map(int, input().split())\n    print(a + b)',
    tests: [
      {
        input: '5\n3 7\n',
        expectedOutput: '10\n'
      }
    ]
  },
  invalidTask: {
    title: '',
    description: '',
    difficulty: 'invalid',
    category: 'invalid',
    timeLimit: -1,
    memoryLimit: -1,
    inputFormat: '',
    outputFormat: '',
    examples: [],
    solution: '',
    tests: []
  }
};

export const searchQueries = {
  tournament: 'algorithm',
  task: 'sorting',
  user: 'test',
  invalid: 'nonexistentquery123456'
};

export const filterOptions = {
  difficulty: ['easy', 'medium', 'hard'],
  category: ['algorithms', 'data-structures', 'math', 'strings'],
  status: ['upcoming', 'ongoing', 'completed'],
  sortBy: ['date', 'popularity', 'difficulty']
};

export const routes = {
  public: ['/', '/auth', '/tournaments', '/tasks', '/contract'],
  protected: ['/dashboard', '/profile', '/my-tournaments', '/subscription', '/progress'],
  admin: ['/admin/tournaments', '/admin/users', '/admin/subscriptions', '/admin/settings']
};

export const timeouts = {
  short: 1000,
  medium: 3000,
  long: 10000,
  extraLong: 30000
};

export const messages = {
  success: {
    login: 'Успішний вхід',
    registration: 'Реєстрація успішна',
    tournamentCreated: 'Турнір створено',
    taskCreated: 'Задачу створено',
    profileUpdated: 'Профіль оновлено'
  },
  error: {
    invalidCredentials: 'Невірні дані',
    emailRequired: 'Email обов\'язковий',
    passwordRequired: 'Пароль обов\'язковий',
    passwordMismatch: 'Паролі не співпадають',
    tournamentNotFound: 'Турнір не знайдено',
    taskNotFound: 'Задачу не знайдено'
  },
  validation: {
    emailInvalid: 'Невірний формат email',
    passwordTooShort: 'Пароль занадто короткий',
    titleRequired: 'Назва обов\'язкова',
    descriptionRequired: 'Опис обов\'язковий'
  }
};
