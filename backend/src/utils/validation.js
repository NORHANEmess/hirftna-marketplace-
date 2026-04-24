'use strict';

const getIssuePath = (issue) => issue.path?.join('.') || 'unknown';

const issuesToErrorMap = (issues = []) => issues.reduce((acc, issue) => {
  const path = getIssuePath(issue);

  if (!acc[path]) {
    acc[path] = issue.message;
  }

  return acc;
}, {});

const zodErrorToErrorMap = (error) => issuesToErrorMap(error?.issues ?? error?.errors ?? []);

module.exports = {
  issuesToErrorMap,
  zodErrorToErrorMap,
};
