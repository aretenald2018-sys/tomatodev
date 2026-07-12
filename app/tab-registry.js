export const TAB_REGISTRY = Object.freeze({
  home: Object.freeze({ id: 'home', panelId: 'tab-home', eager: true }),
  diet: Object.freeze({ id: 'diet', panelId: 'tab-diet', eager: true }),
  workout: Object.freeze({ id: 'workout', panelId: 'tab-workout', eager: true }),
  calendar: Object.freeze({ id: 'calendar', panelId: 'tab-calendar', module: './render-calendar.js' }),
  stats: Object.freeze({ id: 'stats', panelId: 'tab-stats', module: './render-stats.js' }),
  cooking: Object.freeze({ id: 'cooking', panelId: 'tab-cooking', module: './render-cooking.js' }),
  admin: Object.freeze({ id: 'admin', panelId: 'tab-admin', module: './render-admin.js', adminOnly: true }),
});

export const TAB_IDS = Object.freeze(Object.keys(TAB_REGISTRY));

export function getTabDefinition(tabId) {
  return TAB_REGISTRY[tabId] || null;
}

export function isRegisteredTab(tabId) {
  return Object.hasOwn(TAB_REGISTRY, tabId);
}
