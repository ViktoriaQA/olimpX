import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class TasksPage extends BasePage {
  readonly tasksList: Locator;
  readonly createTaskButton: Locator;
  readonly taskCard: Locator;
  readonly filterButton: Locator;
  readonly searchInput: Locator;
  readonly difficultyFilter: Locator;
  readonly categoryFilter: Locator;
  readonly solveButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly taskTitle: Locator;
  readonly taskDescription: Locator;
  readonly taskDifficulty: Locator;

  constructor(page: Page) {
    super(page);
    this.tasksList = page.locator('[data-testid="tasks-list"]');
    this.createTaskButton = page.locator('[data-testid="create-task-btn"]');
    this.taskCard = page.locator('[data-testid="task-card"]');
    this.filterButton = page.locator('[data-testid="filter-btn"]');
    this.searchInput = page.locator('input[placeholder*="Пошук"]');
    this.difficultyFilter = page.locator('[data-testid="difficulty-filter"]');
    this.categoryFilter = page.locator('[data-testid="category-filter"]');
    this.solveButton = page.locator('[data-testid="solve-btn"]');
    this.editButton = page.locator('[data-testid="edit-btn"]');
    this.deleteButton = page.locator('[data-testid="delete-btn"]');
    this.taskTitle = page.locator('[data-testid="task-title"]');
    this.taskDescription = page.locator('[data-testid="task-description"]');
    this.taskDifficulty = page.locator('[data-testid="task-difficulty"]');
  }

  async navigateToTasks(): Promise<void> {
    await this.navigateTo('/tasks');
  }

  async clickCreateTask(): Promise<void> {
    await this.clickElement(this.createTaskButton);
  }

  async searchTasks(query: string): Promise<void> {
    await this.fillInput(this.searchInput, query);
  }

  async filterByDifficulty(difficulty: string): Promise<void> {
    await this.clickElement(this.difficultyFilter);
    await this.page.locator(`[data-value="${difficulty}"]`).click();
  }

  async filterByCategory(category: string): Promise<void> {
    await this.clickElement(this.categoryFilter);
    await this.page.locator(`[data-value="${category}"]`).click();
  }

  async clickSolveTask(): Promise<void> {
    await this.clickElement(this.solveButton);
  }

  async clickEditTask(): Promise<void> {
    await this.clickElement(this.editButton);
  }

  async clickDeleteTask(): Promise<void> {
    await this.clickElement(this.deleteButton);
  }

  async getTasksCount(): Promise<number> {
    return await this.taskCard.count();
  }

  async getFirstTaskTitle(): Promise<string | null> {
    const firstCard = this.taskCard.first();
    const titleElement = firstCard.locator('[data-testid="task-title"]');
    return await titleElement.textContent();
  }

  async verifyTasksListVisible(): Promise<boolean> {
    return await this.verifyElementVisible(this.tasksList);
  }

  async verifyCreateButtonVisible(): Promise<boolean> {
    return await this.verifyElementVisible(this.createTaskButton);
  }

  async verifyTaskCardVisible(): Promise<boolean> {
    return await this.verifyElementVisible(this.taskCard);
  }

  async waitForTasksToLoad(): Promise<void> {
    await this.waitForElement(this.tasksList, 10000);
  }

  async clickFirstTask(): Promise<void> {
    await this.clickElement(this.taskCard.first());
  }
}
