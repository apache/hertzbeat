/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import {
  AlertGroupContractError,
  AlertGroupMissingError,
  type AlertGroupConverge,
  type AlertGroupPage,
  type AlertGroupQuery
} from './alert-group-model';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger, 'Expected a safe integer');
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0, 'Expected a positive integer');
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0, 'Expected a non-negative integer');
const nonBlankTextSchema = z.string().refine(value => Boolean(value.trim()), 'Expected non-blank text');
const uniqueLabelsSchema = z.array(nonBlankTextSchema)
  .refine(labels => new Set(labels).size === labels.length, 'Expected unique labels');
const nullableAuditTextSchema = z.string().nullable().optional();
const nullableLocalDateTimeSchema = z.string()
  .refine(isLocalDateTime, 'Expected a Java local date-time')
  .nullable()
  .optional();

const alertGroupSchema = z.object({
  id: positiveIntegerSchema,
  name: nonBlankTextSchema.max(100),
  groupLabels: uniqueLabelsSchema.nullable(),
  groupWait: nonNegativeIntegerSchema.nullable(),
  groupInterval: nonNegativeIntegerSchema.nullable(),
  repeatInterval: nonNegativeIntegerSchema.nullable(),
  enable: z.boolean().nullable(),
  creator: nullableAuditTextSchema,
  modifier: nullableAuditTextSchema,
  gmtCreate: nullableLocalDateTimeSchema,
  gmtUpdate: nullableLocalDateTimeSchema
});

const alertGroupPageSchema = z.object({
  content: z.array(alertGroupSchema),
  totalElements: nonNegativeIntegerSchema,
  totalPages: nonNegativeIntegerSchema,
  number: nonNegativeIntegerSchema,
  size: positiveIntegerSchema
});

export function parseAlertGroupDetail(value: unknown): AlertGroupConverge {
  if (value == null) throw new AlertGroupMissingError();
  return mapAlertGroup(parseSchema(alertGroupSchema, value, 'Alert group detail'));
}

export function parseAlertGroupPage(value: unknown, query: AlertGroupQuery): AlertGroupPage {
  const page = parseSchema(alertGroupPageSchema, value, 'Alert group page');
  if (page.number !== query.pageIndex || page.size !== query.pageSize) {
    throw new AlertGroupContractError('Page does not match the request');
  }
  if (page.totalPages !== Math.ceil(page.totalElements / page.size)) {
    throw new AlertGroupContractError('totalPages is inconsistent');
  }
  const availableContent = Math.max(0, page.totalElements - page.number * page.size);
  if (page.content.length > Math.min(page.size, availableContent)) {
    throw new AlertGroupContractError('Page content is inconsistent');
  }
  if (new Set(page.content.map(item => item.id)).size !== page.content.length) {
    throw new AlertGroupContractError('Duplicate ids are not allowed');
  }
  return { ...page, content: page.content.map(mapAlertGroup) };
}

function mapAlertGroup(source: z.output<typeof alertGroupSchema>): AlertGroupConverge {
  return {
    id: source.id,
    name: source.name,
    groupLabels: source.groupLabels,
    groupWait: source.groupWait,
    groupInterval: source.groupInterval,
    repeatInterval: source.repeatInterval,
    enable: source.enable,
    ...(source.creator === undefined ? {} : { creator: source.creator }),
    ...(source.modifier === undefined ? {} : { modifier: source.modifier }),
    ...(source.gmtCreate === undefined ? {} : { gmtCreate: source.gmtCreate }),
    ...(source.gmtUpdate === undefined ? {} : { gmtUpdate: source.gmtUpdate })
  };
}

function parseSchema<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new AlertGroupContractError(`${label} did not match the response contract`, { cause: result.error });
}

function isLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return month >= 1 && month <= 12
    && day >= 1 && day <= daysInMonth(year, month)
    && Number(hourText) <= 23
    && Number(minuteText) <= 59
    && Number(secondText) <= 59;
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
