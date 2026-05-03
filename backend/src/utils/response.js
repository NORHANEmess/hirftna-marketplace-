'use strict';

const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const sendError = (res, message = 'Something went wrong', statusCode = 500, errors = null) =>
  res.status(statusCode).json({ success: false, message, errors });

const ensureArray = (items) => {
  if (items === null || items === undefined) return [];
  if (!Array.isArray(items)) {
    throw new Error(`Expected an array response payload, received: ${typeof items}`);
  }
  return items;
};

const buildPaginationMeta = (pagination) => {
  if (!pagination || typeof pagination !== 'object') {
    throw new Error('A pagination object { page, limit, total } is required for list responses');
  }

  const page  = Number(pagination.page);
  const limit = Number(pagination.limit);
  const total = Number(pagination.total);

  if (
    !Number.isFinite(page)  || page  < 1 ||
    !Number.isFinite(limit) || limit < 1 ||
    !Number.isFinite(total) || total < 0
  ) {
    throw new Error(
      `Invalid pagination values: page=${pagination.page}, limit=${pagination.limit}, total=${pagination.total}`
    );
  }

  const totalPages = Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
};

const sendCollection = (
  res,
  items,
  pagination   = null,
  message      = 'Data fetched successfully',
  aliases      = [],
  extraData    = {},
  statusCode   = 200
) => {
  const safeItems = ensureArray(items);
  const data = { items: safeItems, ...extraData };

  if (pagination) data.pagination = buildPaginationMeta(pagination);

  aliases.forEach((alias) => {
    if (alias && alias !== 'items') data[alias] = safeItems;
  });

  return sendSuccess(res, data, message, statusCode);
};

const sendEntity = (res, entityName, entity, message = 'Success', statusCode = 200, extraData = {}) =>
  sendSuccess(res, { [entityName]: entity, ...extraData }, message, statusCode);

const sendPaginated = (res, items, pagination, message = 'Data fetched successfully') =>
  sendCollection(res, items, pagination, message);

module.exports = { sendSuccess, sendError, sendPaginated, sendCollection, sendEntity, buildPaginationMeta };
