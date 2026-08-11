import test from "node:test";
import assert from "node:assert/strict";
import { notificationCategory, notificationDestination } from "../lib/notification-center";

test("un message ouvre directement la messagerie de la bonne famille",()=>{assert.equal(notificationDestination("MESSAGE","abc"),"/app?space=abc&section=more&area=messages");});
test("une activité ajoutée ouvre Aujourd'hui",()=>{assert.equal(notificationDestination("ACTIVITY_DONE","abc"),"/app?space=abc&section=today");});
test("un résumé de garde ouvre Aujourd'hui",()=>{assert.equal(notificationDestination("SHIFT_ENDED","abc"),"/app?space=abc&section=today");});
test("une modification du planning ouvre directement le bon jour",()=>{assert.equal(notificationDestination("PLANNING_UPDATED:2026-08-14","abc"),"/app?space=abc&section=planning&date=2026-08-14");assert.equal(notificationCategory("PLANNING_UPDATED:2026-08-14"),"activity");});
test("les catégories restent simples pour l'interface",()=>{assert.equal(notificationCategory("MESSAGE"),"message");assert.equal(notificationCategory("ACTIVITY_DONE"),"activity");assert.equal(notificationCategory("SHIFT_ENDED"),"handover");});
