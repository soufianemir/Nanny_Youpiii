import { expect, test } from "@playwright/test";

test("le parcours quotidien reste compréhensible sur mobile",async({page})=>{
  await page.goto("/demo?role=parent&section=today");
  await expect(page.getByRole("heading",{name:/Bonjour Camille/i})).toBeVisible();
  await expect(page.getByRole("navigation",{name:"Navigation principale"})).toBeVisible();
  await page.getByRole("link",{name:/Planning/}).click();
  await expect(page.getByText("Une activité reste prévue tant qu’un adulte ne la marque pas faite.")).toBeVisible();
  await expect(page.getByText("Journée")).toBeVisible();
  await page.getByRole("link",{name:/Aujourd’hui/}).click();
  await expect(page.getByRole("heading",{name:/Bonjour Camille/i})).toBeVisible();
});

test("la vue nounou reste centrée sur la journée",async({page})=>{
  await page.goto("/demo?role=nanny&caregiver=nora&section=today");
  await expect(page.getByRole("heading",{name:/Bonjour Nora/i})).toBeVisible();
  await expect(page.getByText(/Ma journée/)).toBeVisible();
  await expect(page.getByText(/garde en cours/i)).toBeVisible();
});
