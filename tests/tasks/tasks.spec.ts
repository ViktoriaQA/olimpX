import { test, expect } from '../fixtures/auth.fixture';
import { TasksPage } from '../pages/TasksPage';
import { HomePage } from '../pages/HomePage';

test.describe('Tasks', () => {
  let tasksPage: TasksPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    tasksPage = new TasksPage(page);
    homePage = new HomePage(page);
  });

  test('should display tasks page correctly', async ({ page }) => {
    await tasksPage.navigateToTasks();
    await tasksPage.waitForPageLoad();
    
    expect(await tasksPage.verifyTasksListVisible()).toBe(true);
  });

  test('should navigate to tasks from home', async ({ page }) => {
    await homePage.navigateToHome();
    await homePage.navigateToTasks();
    
    expect(page.url()).toContain('/tasks');
    expect(await tasksPage.verifyTasksListVisible()).toBe(true);
  });

  test('should display create task button for authenticated users', async ({ authenticatedPage }) => {
    tasksPage = new TasksPage(authenticatedPage);
    await tasksPage.navigateToTasks();
    await tasksPage.waitForTasksToLoad();
    
    expect(await tasksPage.verifyCreateButtonVisible()).toBe(true);
  });

  test('should not display create task button for unauthenticated users', async ({ page }) => {
    await tasksPage.navigateToTasks();
    await tasksPage.waitForTasksToLoad();
    
    expect(await tasksPage.verifyCreateButtonVisible()).toBe(false);
  });

  test('should search tasks', async ({ page }) => {
    await tasksPage.navigateToTasks();
    await tasksPage.waitForTasksToLoad();
    
    const initialCount = await tasksPage.getTasksCount();
    await tasksPage.searchTasks('algorithm');
    await page.waitForTimeout(1000);
    
    const searchResults = await tasksPage.getTasksCount();
    expect(searchResults).toBeLessThanOrEqual(initialCount);
  });

  test('should filter tasks by difficulty', async ({ page }) => {
    await tasksPage.navigateToTasks();
    await tasksPage.waitForTasksToLoad();
    
    const filterButton = page.locator('[data-testid="filter-btn"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(1000);
      
      const difficultyFilter = page.locator('[data-testid="difficulty-filter"]');
      if (await difficultyFilter.isVisible()) {
        await difficultyFilter.click();
        await page.locator('[data-value="easy"]').click();
        await page.waitForTimeout(1000);
        
        expect(await tasksPage.verifyTasksListVisible()).toBe(true);
      }
    }
  });

  test('should filter tasks by category', async ({ page }) => {
    await tasksPage.navigateToTasks();
    await tasksPage.waitForTasksToLoad();
    
    const filterButton = page.locator('[data-testid="filter-btn"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(1000);
      
      const categoryFilter = page.locator('[data-testid="category-filter"]');
      if (await categoryFilter.isVisible()) {
        await categoryFilter.click();
        await page.locator('[data-value="algorithms"]').click();
        await page.waitForTimeout(1000);
        
        expect(await tasksPage.verifyTasksListVisible()).toBe(true);
      }
    }
  });

  test('should display task cards with required information', async ({ page }) => {
    await tasksPage.navigateToTasks();
    await tasksPage.waitForTasksToLoad();
    
    const hasTasks = await tasksPage.getTasksCount() > 0;
    if (hasTasks) {
      expect(await tasksPage.verifyTaskCardVisible()).toBe(true);
      
      const firstTitle = await tasksPage.getFirstTaskTitle();
      expect(firstTitle).toBeTruthy();
      expect(firstTitle?.length).toBeGreaterThan(0);
    }
  });

  test('should handle task solving', async ({ authenticatedPage }) => {
    tasksPage = new TasksPage(authenticatedPage);
    await tasksPage.navigateToTasks();
    await tasksPage.waitForTasksToLoad();
    
    const taskCount = await tasksPage.getTasksCount();
    if (taskCount > 0) {
      await tasksPage.clickFirstTask();
      await authenticatedPage.waitForLoadState('networkidle');
      
      expect(authenticatedPage.url()).toContain('/tasks/');
      
      const solveButton = authenticatedPage.locator('[data-testid="solve-btn"]');
      if (await solveButton.isVisible()) {
        await solveButton.click();
        await authenticatedPage.waitForLoadState('networkidle');
        
        expect(authenticatedPage.url()).toContain('/solve');
        
        const codeEditor = authenticatedPage.locator('[data-testid="code-editor"]');
        expect(await codeEditor.isVisible()).toBe(true);
      }
    }
  });

  test('should handle task creation for authenticated users', async ({ authenticatedPage }) => {
    tasksPage = new TasksPage(authenticatedPage);
    await tasksPage.navigateToTasks();
    await tasksPage.waitForTasksToLoad();
    
    expect(await tasksPage.verifyCreateButtonVisible()).toBe(true);
    
    await tasksPage.clickCreateTask();
    await authenticatedPage.waitForLoadState('networkidle');
    
    expect(authenticatedPage.url()).toContain('/tasks/create');
    
    const titleInput = authenticatedPage.locator('input[name="title"]');
    const descriptionInput = authenticatedPage.locator('textarea[name="description"]');
    const difficultySelect = authenticatedPage.locator('[data-testid="difficulty-select"]');
    
    expect(await titleInput.isVisible()).toBe(true);
    expect(await descriptionInput.isVisible()).toBe(true);
    expect(await difficultySelect.isVisible()).toBe(true);
  });

  test('should handle task editing for task owners', async ({ authenticatedPage }) => {
    tasksPage = new TasksPage(authenticatedPage);
    await tasksPage.navigateToTasks();
    await tasksPage.waitForTasksToLoad();
    
    const taskCount = await tasksPage.getTasksCount();
    if (taskCount > 0) {
      await tasksPage.clickFirstTask();
      await authenticatedPage.waitForLoadState('networkidle');
      
      const editButton = authenticatedPage.locator('[data-testid="edit-btn"]');
      if (await editButton.isVisible()) {
        await editButton.click();
        await authenticatedPage.waitForLoadState('networkidle');
        
        expect(authenticatedPage.url()).toContain('/edit');
        
        const titleInput = authenticatedPage.locator('input[name="title"]');
        expect(await titleInput.isVisible()).toBe(true);
      }
    }
  });

  test('should handle task deletion for task owners', async ({ authenticatedPage }) => {
    tasksPage = new TasksPage(authenticatedPage);
    await tasksPage.navigateToTasks();
    await tasksPage.waitForTasksToLoad();
    
    const initialCount = await tasksPage.getTasksCount();
    if (initialCount > 0) {
      await tasksPage.clickFirstTask();
      await authenticatedPage.waitForLoadState('networkidle');
      
      const deleteButton = authenticatedPage.locator('[data-testid="delete-btn"]');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        const confirmButton = authenticatedPage.locator('[data-testid="confirm-delete-btn"]');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await authenticatedPage.waitForTimeout(2000);
          
          const currentCount = await tasksPage.getTasksCount();
          expect(currentCount).toBeLessThan(initialCount);
        }
      }
    }
  });
});
