describe('Dashboard Smoke Test', () => {
  it('loads dashboard and shows key panels', () => {
    cy.visit('/');
    cy.contains('h1', 'Dashboard', { timeout: 10000 }).should('be.visible');
    cy.get('body').should('contain.text', 'OMNI-SOC VERSION 2026.3.11');
    cy.get('body').should('contain.text', 'LIVE TELEMETRY ACTIVE');
    cy.contains('Please log in to access the dashboard.').should('not.exist');
  });
});
