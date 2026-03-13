describe('Dashboard Smoke Test', () => {
  it('loads dashboard and shows key panels', () => {
    cy.visit('/');
    cy.get('h1').contains('Dashboard');
    cy.get('[data-cy="ThreatHeatMap-label"]').should('exist');
    cy.get('[data-cy="UserLabel-label"]').should('exist');
    cy.get('[data-cy="KillSwitch-label"]').should('exist');
  });
});
