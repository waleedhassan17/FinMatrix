// Backup & export and the Migration Center are the owner's: a staff member's
// navigator must not register them (staffNavigator.test.ts asserts every
// forbidden route is absent; this pins the three onto that list).
import { STAFF_FORBIDDEN_ROUTES, STAFF_MORE_ROUTE_NAMES } from '../../navigations-maps/staffMoreRouteNames';

describe('owner-only data routes', () => {
  it.each(['BackupExport', 'MigrationList', 'MigrationBatch'])('%s is forbidden to staff', route => {
    expect(STAFF_FORBIDDEN_ROUTES as readonly string[]).toContain(route);
    expect(STAFF_MORE_ROUTE_NAMES as readonly string[]).not.toContain(route);
  });
});
