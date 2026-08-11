import { expect, test } from "@playwright/test";

test("le parcours quotidien reste compréhensible sur mobile",async({page})=>{
  await page.goto("/demo?role=parent&section=today");
  await expect(page.getByRole("heading",{name:/Bonjour Camille/i})).toBeVisible();
  const nav=page.getByRole("navigation",{name:"Navigation principale"});
  await expect(nav).toBeVisible();
  await nav.getByRole("link",{name:"Planning",exact:true}).click();
  await expect(page.getByText("Une seule vue pour les activités, les routines et les horaires de garde.")).toBeVisible();
  await expect(page.getByText("Journée",{exact:true})).toBeVisible();
  await page.getByRole("navigation",{name:"Navigation principale"}).getByRole("link",{name:"Courses",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Courses",exact:true})).toBeVisible();
  await page.getByRole("navigation",{name:"Navigation principale"}).getByRole("link",{name:"Aujourd’hui",exact:true}).click();
  await expect(page.getByRole("heading",{name:/Bonjour Camille/i})).toBeVisible();
});

test("la vue nounou reste centrée sur la journée",async({page})=>{
  await page.goto("/demo?role=nanny&caregiver=nora&section=today");
  await expect(page.getByRole("heading",{name:/Bonjour Nora/i})).toBeVisible();
  await expect(page.getByText("Ma journée",{exact:true})).toBeVisible();
  await expect(page.getByText(/garde en cours/i)).toBeVisible();
});
