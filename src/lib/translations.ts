// ============================================================
// Translations — Словарь локализации CRM (RU / UKR)
// ============================================================

export type Lang = 'ru' | 'ukr';

type TranslationMap = Record<string, string>;

const ru: TranslationMap = {
  // --- Навигация ---
  dashboard: 'Дашборд',
  orders: 'Заказы',
  payment_calendar: 'Платёжный календарь',
  settings: 'Настройки',
  finance: 'Финансы',
  furniture_manufacturing: 'Мебельное производство',

  // --- Дашборд ---
  cash_gap_alert: 'Внимание! Прогнозируется кассовый разрыв',
  deficit: 'Дефицит',
  solve_problem: 'Решить проблему',
  active_orders: 'Активных заказов',
  expected_profit: 'Ожидаемая прибыль',
  month_payments: 'Выплаты месяца',
  week_payments: 'Выплаты на этой неделе',
  hot_shipments: 'Горящие отгрузки',
  order_funnel: 'Воронка заказов',
  recent_activity: 'Недавняя активность',
  no_hot_shipments: 'Нет горящих отгрузок',
  no_cash_gap: 'Кассовых разрывов не обнаружено',
  margin_chart: 'Маржинальность по заказам',

  // --- Заказы ---
  search_placeholder: 'Поиск по ID или названию...',
  import_from_1c: 'Импортировать заказ из 1С',
  import_title: 'Импорт заказа из 1С',
  import_description: 'Введите ID заказа из системы 1С для импорта данных',
  import_id_placeholder: 'Введите ID заказа (например: ORD-042)',
  loading: 'Загрузка...',
  save: 'Добавить',
  cancel: 'Отмена',
  id: 'ID',
  order_name: 'Название',
  status: 'Статус',
  order_amount: 'Сумма заказа',
  margin: 'Маржа',
  deadline: 'Дедлайн',
  actions: 'Действия',
  orders_not_found: 'Заказы не найдены',
  no_orders: 'Заказов пока нет',
  no_orders_desc: 'Нажмите кнопку выше, чтобы импортировать первый заказ из 1С',
  back_to_orders: 'Назад к списку заказов',
  order_not_found: 'Заказ не найден',
  order_card: 'Карточка',
  sort_asc: 'Сортировка А→Я',
  sort_desc: 'Сортировка Я→А',
  no_results: 'Нет результатов',

  // --- Статусы ---
  status_design: 'Проектирование',
  status_purchasing: 'Закупка материалов',
  status_production: 'В производстве',
  status_assembly: 'Сборка',
  status_delivery: 'Доставка',
  status_shipped: 'Отгружен',
  status_claims: 'Рекламации',
  status_completed: 'Выполнен',
  status_paid: 'Оплачен',

  // --- Карточка заказа ---
  planned_margin: 'Плановая маржа',
  actual_margin: 'Фактическая маржа',
  cost: 'Себестоимость',
  tab_spec: 'Данные из 1С',
  tab_timeline: 'Таймлайн',
  tab_budget: 'Бюджетирование',
  tab_calendar: 'Календарь заказа',
  production_start: 'Старт производства',
  assembly_start: 'Начало сборки',
  shipping_deadline: 'Дедлайн отгрузки',
  shipping_start: 'Начало отгрузки',
  total_production_days: 'Общий срок производства',
  days: 'дней',
  weeks_short: 'нед.',
  spec_readonly: 'только чтение',
  spec_not_loaded: 'Спецификация не загружена из 1С',
  no_spec: 'Спецификация пуста',
  no_spec_desc: 'Данные о материалах ещё не загружены из 1С',
  material: 'Материал',
  unit: 'Ед. изм.',
  quantity: 'Кол-во',
  price_per_unit: 'Цена за ед.',
  total: 'Итого',
  total_materials_cost: 'Итого себестоимость (материалы)',

  // --- Бюджетирование ---
  budget_title: 'Бюджет заказа',
  additional_expenses: 'дополнительные расходы',
  expense_item: 'Статья расходов',
  income_item: 'Статья доходов',
  plan: 'План (₴)',
  fact_from_1c: 'Факт из 1С',
  deviation: 'Отклонение',
  no_expenses: 'Статьи расходов не добавлены',
  no_expenses_desc: 'Дополнительные расходы для этого заказа ещё не созданы',
  split_to_tranches: 'Разбить на транши',
  add_tranche: 'Добавить транш',
  remaining: 'Осталось распределить',
  total_plan: 'Итого план',
  total_fact: 'Итого факт',
  tranche: 'Транш',
  add_expense: '+ Добавить статью расходов',
  add_income: '+ Добавить статью доходов',
  expense_name_placeholder: 'Название статьи (например: Логистика)',
  income_name_placeholder: 'Название статьи (например: Доп. оплата)',
  toast_budget_item_added: 'Статья успешно добавлена',
  toast_budget_item_removed: 'Статья успешно удалена',

  // --- Платёжный календарь ---
  calendar_title: 'Платёжный календарь',
  income_advances: 'Авансы заказов',
  income_finals: 'Окончательные оплаты',
  materials_expense: 'Материалы (себестоимость)',
  budget_overflow: 'Превышение плана!',
  budget_overflow_desc: 'Сумма траншей превышает плановое значение статьи',
  article: 'Статья',
  income: 'Поступления',
  expenses: 'Выплаты',
  total_income: 'Итого поступления',
  total_expenses: 'Итого выплаты',
  balance: 'БАЛАНС',
  cumulative_balance: 'Кумулятивный баланс (Поступления − Выплаты)',
  cash_gap: 'Кассовый разрыв!',
  week: 'Неделя',
  select_month: 'Выберите месяц',
  filter_order: 'Фильтр по заказу',
  all_orders: 'Все заказы',
  detail_title: 'Детализация',
  drilldown_order: 'Заказ (ID + Название)',
  drilldown_amount: 'Сумма (₴)',
  drilldown_total: 'ИТОГО',
  no_data_for_month: 'Нет данных за выбранный месяц',
  no_data_for_filter: 'Нет данных для выбранного фильтра',

  // --- Хедер ---
  synced_with_1c: 'Синхронизировано с 1С',
  manager: 'Менеджер',
  global_search: 'Поиск заказа (ID или название)...',

  // --- Таймлайн ---
  completed: 'Выполнено',

  // --- Общее ---
  close: 'Закрыть',

  // --- Тосты ---
  toast_status_changed: 'Статус заказа успешно изменен на',
  toast_order_imported: 'Заказ успешно импортирован из 1С',
  toast_tranche_added: 'Транш успешно добавлен',
  toast_tranche_removed: 'Транш успешно удален',
  toast_synced: 'Данные успешно синхронизированы с 1С',
};

const ukr: TranslationMap = {
  // --- Навигация ---
  dashboard: 'Дашборд',
  orders: 'Замовлення',
  payment_calendar: 'Платіжний календар',
  settings: 'Налаштування',
  finance: 'Фінанси',
  furniture_manufacturing: 'Виробництво меблів',

  // --- Дашборд ---
  cash_gap_alert: 'Увага! Прогнозується касовий розрив',
  deficit: 'Дефіцит',
  solve_problem: 'Вирішити проблему',
  active_orders: 'Активних замовлень',
  expected_profit: 'Очікуваний прибуток',
  month_payments: 'Виплати місяця',
  week_payments: 'Виплати на цьому тижні',
  hot_shipments: 'Гарячі відправлення',
  order_funnel: 'Воронка замовлень',
  recent_activity: 'Остання активність',
  no_hot_shipments: 'Немає гарячих відправлень',
  no_cash_gap: 'Касових розривів не виявлено',
  margin_chart: 'Маржинальність за замовленнями',

  // --- Замовлення ---
  search_placeholder: 'Пошук за ID або назвою...',
  import_from_1c: 'Імпортувати замовлення з 1С',
  import_title: 'Імпорт замовлення з 1С',
  import_description: 'Введіть ID замовлення з системи 1С для імпорту даних',
  import_id_placeholder: 'Введіть ID замовлення (наприклад: ORD-042)',
  loading: 'Завантаження...',
  save: 'Додати',
  cancel: 'Скасувати',
  id: 'ID',
  order_name: 'Назва',
  status: 'Статус',
  order_amount: 'Сума замовлення',
  margin: 'Маржа',
  deadline: 'Дедлайн',
  actions: 'Дії',
  orders_not_found: 'Замовлення не знайдено',
  no_orders: 'Замовлень поки немає',
  no_orders_desc: 'Натисніть кнопку вище, щоб імпортувати перше замовлення з 1С',
  back_to_orders: 'Назад до списку замовлень',
  order_not_found: 'Замовлення не знайдено',
  order_card: 'Картка',
  sort_asc: 'Сортування А→Я',
  sort_desc: 'Сортування Я→А',
  no_results: 'Немає результатів',

  // --- Статусы ---
  status_design: 'Проєктування',
  status_purchasing: 'Закупівля матеріалів',
  status_production: 'У виробництві',
  status_assembly: 'Збірка',
  status_delivery: 'Доставка',
  status_shipped: 'Відвантажено',
  status_claims: 'Рекламації',
  status_completed: 'Виконано',
  status_paid: 'Оплачено',

  // --- Картка замовлення ---
  planned_margin: 'Планова маржа',
  actual_margin: 'Фактична маржа',
  cost: 'Собівартість',
  tab_spec: 'Дані з 1С',
  tab_timeline: 'Таймлайн',
  tab_budget: 'Бюджетування',
  tab_calendar: 'Календар замовлення',
  production_start: 'Старт виробництва',
  assembly_start: 'Початок збірки',
  shipping_deadline: 'Дедлайн відправки',
  shipping_start: 'Початок відправки',
  total_production_days: 'Загальний термін виробництва',
  days: 'днів',
  weeks_short: 'тиж.',
  spec_readonly: 'тільки читання',
  spec_not_loaded: 'Специфікація не завантажена з 1С',
  no_spec: 'Специфікація порожня',
  no_spec_desc: 'Дані про матеріали ще не завантажені з 1С',
  material: 'Матеріал',
  unit: 'Од. вим.',
  quantity: 'Кількість',
  price_per_unit: 'Ціна за од.',
  total: 'Всього',
  total_materials_cost: 'Всього собівартість (матеріали)',

  // --- Бюджетування ---
  budget_title: 'Бюджет замовлення',
  additional_expenses: 'додаткові витрати',
  expense_item: 'Стаття витрат',
  income_item: 'Стаття доходів',
  plan: 'План (₴)',
  fact_from_1c: 'Факт з 1С',
  deviation: 'Відхилення',
  no_expenses: 'Статті витрат не додані',
  no_expenses_desc: 'Додаткові витрати для цього замовлення ще не створені',
  split_to_tranches: 'Розбити на транші',
  add_tranche: 'Додати транш',
  remaining: 'Залишилося розподілити',
  total_plan: 'Всього план',
  total_fact: 'Всього факт',
  tranche: 'Транш',
  add_expense: '+ Додати статтю витрат',
  add_income: '+ Додати статтю доходів',
  expense_name_placeholder: 'Назва статті (наприклад: Логістика)',
  income_name_placeholder: 'Назва статті (наприклад: Дод. оплата)',
  toast_budget_item_added: 'Стаття успішно додана',
  toast_budget_item_removed: 'Стаття успішно видалена',

  // --- Платіжний календар ---
  calendar_title: 'Платіжний календар',
  income_advances: 'Аванси замовлень',
  income_finals: 'Остатні оплати',
  materials_expense: 'Матеріали (собівартість)',
  budget_overflow: 'Перевищення плану!',
  budget_overflow_desc: 'Сума траншей перевищує планове значення статті',
  article: 'Стаття',
  income: 'Надходження',
  expenses: 'Виплати',
  total_income: 'Всього надходження',
  total_expenses: 'Всього виплати',
  balance: 'БАЛАНС',
  cumulative_balance: 'Кумулятивний баланс (Надходження − Виплати)',
  cash_gap: 'Касовий розрив!',
  week: 'Тиждень',
  select_month: 'Оберіть місяць',
  filter_order: 'Фільтр за замовленням',
  all_orders: 'Всі замовлення',
  detail_title: 'Деталізація',
  drilldown_order: 'Замовлення (ID + Назва)',
  drilldown_amount: 'Сума (₴)',
  drilldown_total: 'ВСЬОГО',
  no_data_for_month: 'Немає даних за обраний місяць',
  no_data_for_filter: 'Немає даних для обраного фільтра',

  // --- Хедер ---
  synced_with_1c: 'Синхронізовано з 1С',
  manager: 'Менеджер',
  global_search: 'Пошук замовлення (ID або назва)...',

  // --- Таймлайн ---
  completed: 'Виконано',

  // --- Загальне ---
  close: 'Закрити',

  // --- Тости ---
  toast_status_changed: 'Статус замовлення успішно змінено на',
  toast_order_imported: 'Замовлення успішно імпортовано з 1С',
  toast_tranche_added: 'Транш успішно додано',
  toast_tranche_removed: 'Транш успішно видалено',
  toast_synced: 'Дані успішно синхронізовано з 1С',
};

const dictionaries: Record<Lang, TranslationMap> = { ru, ukr };

/**
 * Функция перевода: t(lang, key) → строка
 * Если ключ не найден, возвращает сам ключ.
 */
export function t(lang: Lang, key: string): string {
  return dictionaries[lang][key] ?? key;
}

/**
 * Хук-обёртка (опционально): useTranslation
 * Возвращает функцию t, привязанную к текущему языку из контекста.
 */
export function useTranslation(tFn: (key: string) => string) {
  return tFn;
}
