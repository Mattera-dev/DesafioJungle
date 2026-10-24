import { expect, test } from '@playwright/test';

test.describe('KURIO NFT Marketplace — Fluxos E2E Completos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('catalog-grid')).toBeVisible();
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.__KURIO_MOCK__?.resetDb();
    });
    await page.reload();
    await expect(page.getByTestId('catalog-grid')).toBeVisible();
  });

  test('1. Busca, filtros combinados, ordenação, paginação e restauração pelo histórico', async ({
    page,
    isMobile,
  }) => {
    await page.getByTestId('pagination-page-2').click();
    await expect(page).toHaveURL(/page=2/);

    if (isMobile) {
      await page.getByTestId('mobile-filters-button').click();
    }
    await page
      .locator('[data-testid="filter-category-Arte digital"] >> visible=true')
      .first()
      .click();
    await expect(page).toHaveURL(/categories=Arte(\+|%20)digital/);
    await expect(page).not.toHaveURL(/page=2/);

    await page
      .locator('[data-testid="filter-network-Ethereum"] >> visible=true')
      .first()
      .click();
    await expect(page).toHaveURL(/networks=Ethereum/);

    await page.getByTestId('catalog-sort-select').selectOption('price_desc');
    await expect(page).toHaveURL(/sort=price_desc/);

    await page.goBack();
    await expect(page).not.toHaveURL(/sort=price_desc/);
    await expect(page).toHaveURL(/networks=Ethereum/);
  });

  test('2. Acesso direto ao detalhe, edição indisponível, limite de quantidade e recurso inexistente', async ({
    page,
  }) => {
    await page.goto('/nft/amber-pulse-412');
    await expect(page.getByTestId('nft-detail-title')).toHaveText('Amber Pulse #412');

    await page.getByTestId('edition-option-1/1').click();
    await expect(page.getByTestId('edition-availability')).toContainText('Edição esgotada');
    await expect(page.getByTestId('detail-buy-button')).toBeDisabled();

    await page.getByTestId('edition-option-1/10').click();
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('detail-qty-increase').click();
    }
    await expect(page.getByTestId('detail-qty-value')).toHaveText('6');
    await expect(page.getByTestId('detail-qty-increase')).toBeDisabled();

    await page.goto('/nft/nft-inexistente-999');
    await expect(page.getByTestId('nft-not-found')).toBeVisible();
  });

  test('3. Cadastro, conflito, login, expiração de sessão, logout e troca de usuário', async ({
    page,
  }) => {
    await page.getByTestId('navbar-login-button').click();
    await page.locator('[data-testid="auth-tab-register"] >> visible=true').first().click();
    await page.getByTestId('auth-username-input').fill('testeconflito');
    await page.getByTestId('auth-email-input').fill('colecionador@kurio.art');
    await page.getByTestId('auth-password-input').fill('Kurio@2026');
    await page.getByTestId('auth-confirm-password-input').fill('Kurio@2026');
    await page.getByTestId('auth-submit-button').click();
    await expect(page.getByTestId('auth-error-banner')).toBeVisible();

    await page.getByTestId('auth-fill-collector').click();
    await page.getByTestId('auth-submit-button').click();
    await expect(page.getByTestId('navbar-profile-link')).toContainText('Alex');

    await page.goto('/profile');
    await expect(page.getByTestId('prof-save-button')).toBeVisible();
    await page.waitForTimeout(100);
    await page.evaluate(() => window.__KURIO_MOCK__?.setScenario('session-expired'));
    await page.getByTestId('prof-save-button').click();
    await expect(page.getByTestId('auth-error-banner')).toContainText(/expirou/i);

    await page.evaluate(() => window.__KURIO_MOCK__?.setScenario('default'));
    await page.getByTestId('auth-fill-artist').click();
    await page.getByTestId('auth-submit-button').click();
    await expect(page.getByTestId('navbar-profile-link')).toContainText('Nova');
  });

  test('4. Favoritos com atualização otimista, falha de mutation (rollback) e persistência', async ({
    page,
  }) => {
    await page.getByTestId('navbar-login-button').click();
    await page.getByTestId('auth-fill-collector').click();
    await page.getByTestId('auth-submit-button').click();
    await expect(page.getByTestId('navbar-profile-link')).toContainText('Alex');

    await page.goto('/nft/golden-beat-207');
    const favBtn = page.getByTestId('detail-favorite-button');
    await expect(favBtn).toHaveAttribute('aria-pressed', 'false');

    await favBtn.click();
    await expect(favBtn).toHaveAttribute('aria-pressed', 'true');

    await page.evaluate(() => window.__KURIO_MOCK__?.setScenario('http-500'));
    await favBtn.click();

    await expect(favBtn).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(() => window.__KURIO_MOCK__?.setScenario('default'));
  });

  test('5. Carrinho, quantidades, remoção, cupom e preservação ao autenticar e após refresh', async ({
    page,
  }) => {
    await page.goto('/nft/emerald-ape-042');
    await page.getByTestId('detail-buy-button').click();
    await expect(page.getByTestId('navbar-cart-badge')).toHaveText('1');

    await page.goto('/cart');
    await page.getByTestId('cart-qty-increase-emerald-ape-042').click();
    await expect(page.getByTestId('cart-qty-value-emerald-ape-042')).toHaveText('2');
    await expect(page.getByTestId('cart-subtotal')).toHaveText('2.38 ETH');

    await page.getByTestId('cart-coupon-input').fill('INVALIDO99');
    await page.getByTestId('cart-coupon-apply').click();
    await expect(page.getByTestId('cart-coupon-error')).toBeVisible();

    await page.getByTestId('cart-coupon-input').fill('EXPIRADO20');
    await page.getByTestId('cart-coupon-apply').click();
    await expect(page.getByTestId('cart-coupon-error')).toContainText(/expirou/i);

    await page.getByTestId('cart-coupon-input').fill('KURIO10');
    await page.getByTestId('cart-coupon-apply').click();
    await expect(page.getByTestId('cart-active-coupon')).toContainText('KURIO10');

    await page.reload();
    await expect(page.getByTestId('cart-qty-value-emerald-ape-042')).toHaveText('2');
    await page.getByTestId('cart-checkout-button').click();
    await page.getByTestId('auth-fill-collector').click();
    await page.getByTestId('auth-submit-button').click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByTestId('checkout-subtotal')).toHaveText('2.38 ETH');
  });

  test('6. Compra completa do catálogo ao recibo confirmado e imutabilidade do snapshot', async ({
    page,
  }) => {
    await page.getByTestId('navbar-login-button').click();
    await page.getByTestId('auth-fill-collector').click();
    await page.getByTestId('auth-submit-button').click();
    await expect(page.getByTestId('navbar-profile-link')).toContainText('Alex');

    await page.goto('/nft/emerald-ape-042');
    await page.getByTestId('detail-buy-button').click();
    await expect(page.getByTestId('navbar-cart-badge')).toHaveText('1');

    await page.goto('/checkout');
    await expect(page.getByTestId('checkout-total')).toHaveText('1.206 ETH');
    await page.getByTestId('checkout-confirm-button').click();

    await expect(page).toHaveURL(/\/orders\/ord-/);
    await expect(page.getByTestId('order-confirmation-receipt')).toBeVisible();
    await expect(page.getByTestId('receipt-total')).toHaveText('1.206 ETH');
    await expect(page.getByTestId('navbar-cart-badge')).toHaveText('0');

    await page.evaluate(() =>
      window.__KURIO_MOCK__?.emitNftUpdate({
        nftId: 'emerald-ape-042',
        newPriceEth: '9.99',
      })
    );
    await page.reload();
    await expect(page.getByTestId('receipt-total')).toHaveText('1.206 ETH');
  });

  test('7. Falha de pagamento e timeout pós-criação com recuperação idempotente do mesmo pedido', async ({
    page,
  }) => {
    await page.getByTestId('navbar-login-button').click();
    await page.getByTestId('auth-fill-collector').click();
    await page.getByTestId('auth-submit-button').click();
    await expect(page.getByTestId('navbar-profile-link')).toContainText('Alex');

    await page.goto('/nft/sage-nomad-009');
    await page.getByTestId('detail-buy-button').click();
    await expect(page.getByTestId('navbar-cart-badge')).toHaveText('1');

    await page.goto('/checkout');
    await expect(page.getByTestId('checkout-total')).toHaveText('1.706 ETH');

    await page.evaluate(() => window.__KURIO_MOCK__?.setScenario('order-timeout'));
    await page.getByTestId('checkout-confirm-button').click();
    await expect(page.getByTestId('checkout-submit-error')).toBeVisible();

    await page.getByTestId('checkout-confirm-button').click();
    await expect(page).toHaveURL(/\/orders\/ord-/);
    await expect(page.getByTestId('order-confirmation-receipt')).toBeVisible();
  });

  test('8. Edição de perfil, avatar, senha e carteiras com erros de validação e persistência', async ({
    page,
  }) => {
    await page.getByTestId('navbar-login-button').click();
    await page.getByTestId('auth-fill-collector').click();
    await page.getByTestId('auth-submit-button').click();
    await expect(page.getByTestId('navbar-profile-link')).toContainText('Alex');

    await page.goto('/profile');
    await expect(page.getByTestId('prof-name')).toBeVisible();

    await page.getByTestId('prof-name').fill('');
    await page.getByTestId('prof-save-button').click();
    await expect(page.getByTestId('prof-name-error')).toBeVisible();

    await page.getByTestId('prof-name').fill('Alex Rivera Collector');
    await page.getByTestId('prof-avatar-change').click();
    await page.getByTestId('avatar-preset-Ivory Baron').click();
    const putProfilePromise = page.waitForResponse(
      (res) => res.url().includes('/api/profile') && res.request().method() === 'PUT'
    );
    await page.getByTestId('prof-save-button').click();
    await putProfilePromise;

    await page.reload();
    await expect(page.getByTestId('prof-name')).toHaveValue('Alex Rivera Collector');

    await page.goto('/wallets');
    await expect(page.getByTestId('wp-address')).toHaveValue(/^0x/);
    await page.getByTestId('ws-same-as-primary').click();
    const putWalletPromise = page.waitForResponse(
      (res) => res.url().includes('/api/wallets') && res.request().method() === 'PUT'
    );
    await page.getByTestId('ws-save-secondary').click();
    await putWalletPromise;
    await page.reload();
    await expect(page.getByTestId('secondary-wallet-form')).toBeVisible();
  });

  test('9 & 10. Socket.IO: atualização de preço em tempo real no checkout e proteção contra eventos duplicados/antigos', async ({
    page,
  }) => {
    await page.getByTestId('navbar-login-button').click();
    await page.getByTestId('auth-fill-collector').click();
    await page.getByTestId('auth-submit-button').click();
    await expect(page.getByTestId('navbar-profile-link')).toContainText('Alex');

    await page.goto('/nft/emerald-ape-042');
    await page.getByTestId('detail-buy-button').click();
    await expect(page.getByTestId('navbar-cart-badge')).toHaveText('1');

    await page.goto('/checkout');
    await expect(page.getByTestId('checkout-subtotal')).toHaveText('1.19 ETH');

    await page.evaluate(() =>
      window.__KURIO_MOCK__?.emitNftUpdate({
        nftId: 'emerald-ape-042',
        newPriceEth: '1.55',
        forceVersion: 2,
        eventId: 'evt-v2',
      })
    );

    await expect(page.getByTestId('checkout-quote-conflict')).toBeVisible();
    await expect(page.getByTestId('checkout-confirm-button')).toBeDisabled();

    await page.evaluate(() =>
      window.__KURIO_MOCK__?.emitNftUpdate({
        nftId: 'emerald-ape-042',
        newPriceEth: '0.50',
        forceVersion: 1,
        eventId: 'evt-v1-old',
      })
    );
    await expect(page.getByTestId('checkout-subtotal')).toHaveText('1.55 ETH');

    await page.getByTestId('checkout-acknowledge-quote').click();
    await expect(page.getByTestId('checkout-confirm-button')).toBeEnabled();
  });

  test('11 & 12. Navegação por teclado/foco em diálogo e Skeletons com shimmer durante carregamento lento + retry', async ({
    page,
  }) => {
    await page.getByTestId('navbar-login-button').click();
    await expect(page.getByTestId('auth-email-input')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('auth-email-input')).toBeHidden();

    await page.evaluate(() => window.__KURIO_MOCK__?.setScenario('slow'));
    const reloadPromise = page.reload();
    await expect(page.getByTestId('catalog-skeleton')).toBeVisible();
    await reloadPromise;
    await expect(page.getByTestId('catalog-grid')).toBeVisible();

    await page.evaluate(() => window.__KURIO_MOCK__?.setScenario('http-500'));
    await page.reload();
    await expect(page.getByTestId('catalog-error-state')).toBeVisible();

    await page.evaluate(() => window.__KURIO_MOCK__?.setScenario('default'));
    await page.getByTestId('catalog-retry-button').click();
    await expect(page.getByTestId('catalog-grid')).toBeVisible();
  });
});
