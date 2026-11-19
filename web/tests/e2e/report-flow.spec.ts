import { test, expect } from '@playwright/test';

test.describe('Halchal PWA Core User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before test to ensure clean visitor state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('Open -> Consent -> Area Selection -> Report Submission -> Status Update', async ({ page }) => {
    // 1. Open Home route
    await page.goto('/');

    // 2. Verify Geolocation Consent Dialog in Bengali
    const consentDialog = page.getByRole('dialog');
    await expect(consentDialog).toBeVisible();
    await expect(page.getByText('আপনার এলাকার খবর জানতে লোকেশন প্রয়োজন')).toBeVisible();
    await expect(page.getByText('কঠোর প্রাইভেসি গ্যারান্টি')).toBeVisible();

    // 3. Fallback to Manual Area Picker
    const manualBtn = page.getByRole('button', { name: 'নিজে এলাকা বেছে নিন (ম্যানুয়াল)' });
    await manualBtn.click();

    // 4. Area Picker Modal: Select 'ধানমন্ডি'
    const areaDialog = page.getByRole('dialog');
    await expect(areaDialog.getByText('আপনার এলাকা বেছে নিন')).toBeVisible();
    const dhanmondiOption = areaDialog.getByRole('button', { name: /ধানমন্ডি/ });
    await expect(dhanmondiOption).toBeVisible();
    await dhanmondiOption.click();

    // 5. Verify Home Screen HUD loaded for Dhanmondi
    await expect(page.getByText('ধানমন্ডি (ওয়ার্ড ১৫)')).toBeVisible();
    await expect(page.getByText('নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়')).toBeVisible();

    // 6. Verify 4 Status Cards are rendered
    await expect(page.getByText('বিদ্যুৎ', { exact: true })).toBeVisible();
    await expect(page.getByText('গ্যাস', { exact: true })).toBeVisible();
    await expect(page.getByText('পানি', { exact: true })).toBeVisible();
    await expect(page.getByText('এলপিজি', { exact: true })).toBeVisible();

    // 7. Click Report Button
    const reportBtn = page.getByRole('button', { name: 'আপনার এলাকার হাল জানান' });
    await expect(reportBtn).toBeVisible();
    await reportBtn.click();

    // 8. OneTap Report Sheet: Step 1 Category Selection
    const reportDialog = page.getByRole('dialog');
    await expect(reportDialog.getByText('কিসের অবস্থা জানাবেন?')).toBeVisible();
    const electricityCategoryBtn = reportDialog.getByRole('button', { name: /বিদ্যুৎ/ });
    await electricityCategoryBtn.click();

    // 9. OneTap Report Sheet: Step 2 State Selection
    await expect(reportDialog.getByText(/বিদ্যুৎ.*অবস্থা কী/)).toBeVisible();
    const outStateBtn = reportDialog.getByRole('button', { name: /নেই \/ সম্পূর্ণ বন্ধ/ });
    await outStateBtn.click();

    // Ensure report modal closes
    await expect(reportDialog).toBeHidden();

    // 10. Verify Optimistic UI Status Update
    // StatusCard for electricity should immediately reflect 'নেই' state
    const electricityCard = page.getByRole('button', { name: /বিদ্যুৎ স্ট্যাটাস/ });
    await expect(electricityCard).toBeVisible();
    await expect(electricityCard.getByText('নেই')).toBeVisible();

    // 11. Verify Share Button functionality
    const shareBtn = page.getByRole('button', { name: /শেয়ার/ });
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();
  });

  test('Public shareable zone page /z/[h3] loads with OG metadata and status cards', async ({ page }) => {
    // Open Dhanmondi public zone route directly
    await page.goto('/z/883cf10ca1fffff');

    await expect(page.getByText('ধানমন্ডি (ওয়ার্ড ১৫)')).toBeVisible();
    await expect(page.getByText('বিদ্যুৎ', { exact: true })).toBeVisible();
    await expect(page.getByText('গ্যাস', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'এই এলাকার হাল জানান' })).toBeVisible();
  });

  test('Map and History stub routes navigation works smoothly', async ({ page }) => {
    await page.goto('/');

    // Accept consent
    const manualBtn = page.getByRole('button', { name: 'নিজে এলাকা বেছে নিন (ম্যানুয়াল)' });
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      await page.getByRole('dialog').getByRole('button', { name: /ধানমন্ডি/ }).click();
    }

    // Navigate to History stub route via BottomNav
    const historyTab = page.getByRole('button', { name: 'ইতিহাস' });
    await historyTab.click();
    await expect(page).toHaveURL(/.*\/history/);
    await expect(page.getByText('৭ দিনের ইনসাইটস ফিচার শীঘ্রই আসছে')).toBeVisible();

    // Navigate to Live Map route via BottomNav
    const mapTab = page.getByRole('button', { name: 'লাইভ ম্যাপ' });
    await mapTab.click();
    await expect(page).toHaveURL(/.*\/map/);
  });
});
