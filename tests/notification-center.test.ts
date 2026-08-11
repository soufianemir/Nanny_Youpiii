import test from "node:test";
import assert from "node:assert/strict";
import { notificationCategory, notificationDestination } from "../lib/notification-center";

test("un message ouvre directement la messagerie de la bonne famille",()=>{assert.equal(notificationDestination("MESSAGE","abc"),"/app?space=abc&section=more&area=messages");});
test("une activité ajoutée ouvre Aujourd'hui",()=>{assert.equal(notificationDestination("ACTIVITY_DONE","abc"),"/app?space=abc&section=today");});
test("un résumé de garde ouvre les transmissions",()=>{assert.equal(notificationDestination("SHIFT_ENDED","abc"),"/app?space=abc&section=more&area=history");});
test("les catégories restent simples pour l'interface",()=>{assert.equal(notificationCategory("MESSAGE"),"message");assert.equal(notificationCategory("ACTIVITY_DONE"),"activity");assert.equal(notificationCategory("SHIFT_ENDED"),"handover");});
