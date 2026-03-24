import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class TournamentsPage extends BasePage {
  readonly tournamentsList: Locator;
  readonly createTournamentButton: Locator;
  readonly tournamentCard: Locator;
  readonly filterButton: Locator;
  readonly searchInput: Locator;
  readonly myTournamentsTab: Locator;
  readonly availableTournamentsTab: Locator;
  readonly registerButton: Locator;
  readonly tournamentTitle: Locator;
  readonly tournamentDescription: Locator;
  readonly tournamentDate: Locator;

  constructor(page: Page) {
    super(page);
    this.tournamentsList = page.locator('[data-testid="tournaments-list"]');
    this.createTournamentButton = page.locator('[data-testid="create-tournament-btn"]');
    this.tournamentCard = page.locator('[data-testid="tournament-card"]');
    this.filterButton = page.locator('[data-testid="filter-btn"]');
    this.searchInput = page.locator('input[placeholder*="Пошук"]');
    this.myTournamentsTab = page.locator('[data-testid="my-tournaments-tab"]');
    this.availableTournamentsTab = page.locator('[data-testid="available-tournaments-tab"]');
    this.registerButton = page.locator('[data-testid="register-btn"]');
    this.tournamentTitle = page.locator('[data-testid="tournament-title"]');
    this.tournamentDescription = page.locator('[data-testid="tournament-description"]');
    this.tournamentDate = page.locator('[data-testid="tournament-date"]');
  }

  async navigateToTournaments(): Promise<void> {
    await this.navigateTo('/tournaments');
  }

  async clickCreateTournament(): Promise<void> {
    await this.clickElement(this.createTournamentButton);
  }

  async searchTournaments(query: string): Promise<void> {
    await this.fillInput(this.searchInput, query);
  }

  async clickMyTournamentsTab(): Promise<void> {
    await this.clickElement(this.myTournamentsTab);
  }

  async clickAvailableTournamentsTab(): Promise<void> {
    await this.clickElement(this.availableTournamentsTab);
  }

  async clickRegisterForTournament(): Promise<void> {
    await this.clickElement(this.registerButton);
  }

  async getTournamentsCount(): Promise<number> {
    return await this.tournamentCard.count();
  }

  async getFirstTournamentTitle(): Promise<string | null> {
    const firstCard = this.tournamentCard.first();
    const titleElement = firstCard.locator('[data-testid="tournament-title"]');
    return await titleElement.textContent();
  }

  async verifyTournamentsListVisible(): Promise<boolean> {
    return await this.verifyElementVisible(this.tournamentsList);
  }

  async verifyCreateButtonVisible(): Promise<boolean> {
    return await this.verifyElementVisible(this.createTournamentButton);
  }

  async verifyTournamentCardVisible(): Promise<boolean> {
    return await this.verifyElementVisible(this.tournamentCard);
  }

  async waitForTournamentsToLoad(): Promise<void> {
    await this.waitForElement(this.tournamentsList, 10000);
  }

  async clickFirstTournament(): Promise<void> {
    await this.clickElement(this.tournamentCard.first());
  }
}
