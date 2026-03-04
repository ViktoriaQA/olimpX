import React from 'react';
import { CodeEditor } from '../components/CodeEditor';

/**
 * Головна сторінка додатку з редактором коду
 */
function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Code Execution Platform</h1>
          <p className="text-muted-foreground">Виконуйте код JavaScript, TypeScript, Python та C++ в безпечному середовищі</p>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <CodeEditor />
      </main>
      
      <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Powered by Piston API • Безпечне виконання коду в ізольованому середовищі
        </div>
      </footer>
    </div>
  );
}

export default App;
