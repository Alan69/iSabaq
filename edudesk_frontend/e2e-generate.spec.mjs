/**
 * E2E: логин и генерация урока в браузере.
 * Запуск: cd edudesk_frontend && node e2e-generate.spec.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const API = 'http://localhost:8000/api';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. Открываю страницу входа...');
    await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 15000 });

    console.log('2. Ввожу логин и пароль...');
    await page.getByTestId('login-username').fill('testuser');
    await page.getByTestId('login-password').fill('testpass123');
    await page.getByTestId('login-submit').click();

    await page.waitForURL(BASE + '/', { timeout: 10000 });
    console.log('3. Вход выполнен, на главной.');

    console.log('4. Ввожу тему урока и нажимаю Создать...');
    await page.getByTestId('sidebar-topic').fill('Дроби и десятичные числа');
    await page.getByTestId('sidebar-create').click();

    console.log('5. Ожидаю редирект на История (генерация может занять 20–60 сек)...');
    await page.waitForURL(BASE + '/history', { timeout: 120000 });

    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(
      () => !document.body.innerText.includes('Загрузка истории...'),
      { timeout: 10000 }
    ).catch(() => {});
    const count = await rows.count();
    console.log('6. На странице История строк в таблице:', count);

    const firstRowText = await rows.first().locator('td').first().textContent();
    console.log('7. Первый урок в списке:', firstRowText?.trim() || '(пусто)');

    console.log('\nГенерация в браузере проверена успешно.');
  } catch (err) {
    console.error('Ошибка:', err.message);
    await page.screenshot({ path: '/tmp/edudesk-e2e-error.png' }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
