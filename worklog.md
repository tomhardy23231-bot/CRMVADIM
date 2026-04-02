---
Task ID: 2
Agent: Main
Task: Major UI/UX refactoring — 6 tasks (sidebar, i18n, status management, dashboard charts, order calendar, micro-interactions)

Work Log:
- Created translations.ts with full RU/UKR dictionary (80+ keys)
- Updated crm-context.tsx: added sidebarCollapsed state, tr() translation helper, onSelectOrder support
- Rewrote Sidebar.tsx: light theme (bg-white), collapsible (w-64↔w-20), tooltips when collapsed, smooth CSS transitions
- Rewrote MobileSidebar.tsx: light theme matching desktop, i18n
- Rewrote Header.tsx: Sonner toast on sync, i18n, improved transitions
- Rewrote Dashboard.tsx: added PieChart (recharts) for order funnel, activity feed with 5 dummy items, empty state icons
- Rewrote OrdersList.tsx: Sonner toast on import, empty state with PackageOpen icon, i18n, hover effects
- Rewrote OrderCard.tsx: status dropdown (DropdownMenu) with color dots, toast on status change, 4th tab "Календарь заказа"
- Created OrderCalendarTab.tsx: local payment calendar per order with advance/final payments, material costs, tranches as expenses
- Rewrote BudgetTab.tsx: Sonner toasts on add/remove tranche, empty state with Receipt icon, i18n
- Rewrote SpecTab.tsx: empty state with FileSpreadsheet icon, i18n
- Rewrote TimelineTab.tsx: i18n for all labels, hover effects on date fields
- Rewrote PaymentCalendar.tsx: i18n, hover transition effects
- Updated layout.tsx: replaced Toaster with Sonner (bottom-right, rich colors)
- Updated page.tsx: dynamic breadcrumbs with language change, onSelectOrder wired to Dashboard

Stage Summary:
- All 6 tasks completed successfully
- Full RU/UKR localization working with instant switching
- Sidebar collapses to icon-only with tooltips
- Status changes via dropdown with toast notifications
- Dashboard has PieChart + activity feed
- Order calendar tab shows per-order economics
- Sonner toasts on: import, sync, status change, tranche add/remove
- Beautiful empty states with icons across all components
- Hover effects: -translate-y-0.5, shadow-md, transition-all duration-200
- ESLint passes cleanly

---
Task ID: 3
Agent: Main
Task: 5 UI/UX improvements — clickable progress bar, month selector, order filter, drill-down modal, sidebar fix

Work Log:
- Updated crm-types.ts: added optional `orderId` field to CalendarRow interface
- Updated crm-mock-data.ts: assigned orderId to all 11 calendar rows (TNDR-001, TNDR-003, TNDR-004, TNDR-005 + shared expenses)
- Updated translations.ts: added 8 new keys for month selector, filter, drilldown modal in both RU and UKR
- **Task 1 (Clickable progress bar)**: Changed `<div>` circles to `<button>` elements in OrderCard.tsx with hover:scale-110, cursor-pointer, focus-visible ring, onClick calls handleStatusChange + toast.success
- **Task 2 (Month selector)**: Added Shadcn `<Select>` with 3 months (Май/Июнь/Июль 2026) to both PaymentCalendar.tsx and OrderCalendarTab.tsx. Each month has different week date headers and data multiplier (1.0 / 0.75 / 0.4)
- **Task 3 (Order filter)**: Added second `<Select>` dropdown "Фильтр по заказу" to global PaymentCalendar.tsx with "Все заказы" default + list of non-shipped orders. Filters calendarRows by orderId.
- **Task 4 (Drill-down modal)**: All income/expense cells with amounts > 0 are now clickable (cursor-pointer, hover:underline, hover:bg color). Clicking opens a professional Shadcn `<Dialog>` with gradient header (emerald for income, red for expense), `<Table>` showing fake order breakdown items that deterministically sum to the clicked cell value, and a styled footer with ИТОГО row
- **Task 5 (Sidebar fix)**: Changed sidebar from absolute-positioned collapse button to flex-col layout when collapsed. In collapsed state, the header stacks vertically (logo + expand button), ensuring the PanelLeftOpen button is always visible and centered below the logo. Added `relative overflow-visible` to the aside.

Stage Summary:
- All 5 tasks completed successfully
- Progress bar circles are interactive buttons with hover animations and toast feedback
- Month/year selector works across PaymentCalendar and OrderCalendarTab
- Order filter shows relevant financial data per order
- Drill-down modal is professional with gradient headers, structured table, and footer
- Sidebar expand button always visible in collapsed state
- ESLint passes cleanly, dev server compiles without errors

---
Task ID: 4
Agent: Main
Task: Deep logical refactoring — dynamic calendar, controlled dates, real drill-down, budget validation

Work Log:
- **crm-types.ts**: Added `shippingStart: string` to Order interface
- **crm-mock-data.ts**: Added `shippingStart` to all 5 orders with realistic dates. **Completely removed `initialCalendarRows`** — global calendar is now purely dynamic.
- **translations.ts**: Added 7 new keys: `shipping_start`, `income_advances`, `income_finals`, `materials_expense`, `budget_overflow`, `budget_overflow_desc` (both RU and UKR)
- **crm-context.tsx**: Removed `calendarRows` state and `initialCalendarRows` import. Added `updateOrderDates(orderId, updates: Partial<Pick<Order, 'productionStart'|'assemblyStart'|'shippingStart'|'deadline'>>)`. Updated `addOrder` to include `shippingStart`.
- **Task 1 (Dynamic Global Calendar)**: Complete rewrite of PaymentCalendar.tsx. New `useComputedCalendar` hook builds raw entries from `orders[]` — for each order: Аванс 30% week1, Остаток 70% week4, Materials 50/50 week1/2, plus all budget item tranches by week. Entries are grouped by (label, isIncome) into ComputedRows. Each row tracks `breakdown: Record<WeekKey, DrilldownItem[]>` with real per-order data. Adding a tranche in BudgetTab instantly recalculates the calendar via React reactivity.
- **Task 2 (TimelineTab controlled inputs)**: TimelineTab.tsx rewritten with 4 controlled `<input type="date">` fields (productionStart, assemblyStart, shippingStart, deadline). Each uses `value={order.field}` and `onChange → updateOrderDates()`. 4th field added with Truck icon.
- **Task 3 (Real drill-down data)**: Completely replaced `generateDrilldownItems()` fake generator with real data from `ComputedRow.breakdown[weekKey]`. Every cell click passes actual `{orderId, orderName, amount}[]` items that sum to the cell value. Total rows (Итого поступления/выплаты) also pass aggregated breakdowns.
- **Task 4 (Budget validation)**: Added `isOverBudget` boolean (`remaining < 0`). When over budget: tranche amount inputs get `border-red-500 focus:ring-red-500 bg-red-50/50` + `aria-invalid`. "Add tranche" button gets `disabled={!canAddTranche}` with grayed-out styling. Warning badge "Превышение плана!" and description text appear below the remaining row. AlertTriangle icon shown in the budget item name cell.

Stage Summary:
- Global payment calendar is now fully reactive — derived from orders state via useMemo
- Adding/removing a tranche in any order's budget instantly updates the global calendar
- Drill-down modal shows real orders that contribute to each cell (no more fake data)
- TimelineTab has 4 controlled date fields that update order state in real-time
- Budget validation prevents exceeding plan with visual feedback (red borders, disabled button, warnings)
- ESLint passes cleanly, dev server compiles without errors

---
Task ID: 5
Agent: Main
Task: Phase 5 — Remove hardcoded logic, add 5 features (dynamic dashboard, budget CRUD, timeline checkboxes, global search, table sorting)

Work Log:
- **crm-types.ts**: Added `isProductionStarted`, `isAssemblyStarted`, `isShipped` boolean flags to Order interface. Added `isIncome?: boolean` to BudgetItem interface. Replaced `DashboardMetrics` and `CashGapAlert` interfaces with `BudgetItemType` type.
- **crm-mock-data.ts**: Removed `initialDashboardMetrics` and `initialCashGapAlert` exports entirely. Added `isIncome: false` to all budget items. Added boolean stage flags to orders TNDR-001 (productionStarted=true), TNDR-003 (production+assembly=true), TNDR-004 (all three=true), TNDR-005 (productionStarted=true).
- **translations.ts**: Added 14 new keys in both RU/UKR: `no_cash_gap`, `sort_asc`, `sort_desc`, `no_results`, `expense_item`, `income_item`, `add_expense`, `add_income`, `expense_name_placeholder`, `income_name_placeholder`, `toast_budget_item_added`, `toast_budget_item_removed`, `global_search`, `completed`, `close`.
- **crm-context.tsx**: Removed `dashboardMetrics` and `cashGapAlert` from state. Removed `DashboardMetrics`/`CashGapAlert` imports. Added `selectedOrderId` + `setSelectedOrderId` to global state. Added `toggleStageFlag(orderId, flag)` for timeline checkboxes. Added `addBudgetItem(orderId, name, isIncome)` and `removeBudgetItem(orderId, itemId)` for budget CRUD.
- **page.tsx**: Moved `selectedOrderId` state from CRMShell local state to CRMContext. Now uses `useCRM().selectedOrderId`/`setSelectedOrderId` instead of `useState`. This enables global search in Header to navigate to orders.
- **Task 1 (Dynamic Dashboard)**: Dashboard.tsx fully rewritten. `activeCount` = orders.filter(status !== 'Отгружен').length. `expectedProfit` = sum of (orderAmount - plannedCost - sum(budgetItems.plan)) for active orders. `weekPayments` = materials 50% week1 + tranches week1 for all active orders. `cashGapAlert` computed from 4-week cumulative balance (same logic as PaymentCalendar). If no gap found, alert is hidden. All computed inline (no useMemo to satisfy React Compiler).
- **Task 2 (Add/Remove Budget Items)**: BudgetTab.tsx rewritten with two action buttons: "+ Добавить статью расходов" and "+ Добавить статью доходов". Clicking opens a Dialog with Input for naming. Income items shown with CircleDollarSign icon. Each item row has a Trash2 delete button. Context functions `addBudgetItem`/`removeBudgetItem` handle CRUD.
- **Task 3 (Timeline Checkboxes)**: TimelineTab.tsx rewritten with 4 DateField components, each having a Shadcn Checkbox "Выполнено" (Факт). When checked: row gets emerald background/border, date input disabled with line-through, icon changes to emerald. Badge counter "2/3 выполнено" shown in CardHeader. The 4th date (deadline) has a non-functional checkbox. Context function `toggleStageFlag` handles boolean flag toggling.
- **Task 4 (Global Search in Header)**: Header.tsx rewritten with centered search Input (hidden on mobile). Typing shows a dropdown with matching orders (up to 8 results), showing ID, status badge, name, and amount. Clicking a result calls `setSelectedOrderId(orderId)` to navigate. Dropdown closes on outside click or Escape key. Empty state "Нет результатов" shown when no matches.
- **Task 5 (Sortable Table)**: OrdersList.tsx updated with `sortConfig: {key, direction} | null` state. "Сумма заказа" and "Дедлайн" column headers are clickable with ArrowUpDown/ArrowUp/ArrowDown icons. Clicking toggles asc→desc→none cycle. SortIcon component extracted outside render to satisfy React Compiler. Filtered array sorted before rendering.

Stage Summary:
- All hardcoded dashboard metrics removed — dynamically computed from real orders data
- Cash gap alert computed from 4-week calendar balance, hidden when no gap
- Budget items fully CRUD: add expense/income via dialog, delete via Trash2 icon
- Timeline checkboxes mark stages as complete with visual feedback (emerald highlight, disabled input)
- Global search in Header navigates directly to order cards from any page
- Orders table sortable by amount and deadline with visual sort indicators
- selectedOrderId moved to Context for global navigation access
- All new texts translated in both RU and UKR
- ESLint passes cleanly, dev server compiles successfully
