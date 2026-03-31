export const siteNoticeQuery = `
  *[_type == "siteNotice" && _id == "site-notice"][0]{
    _id,
    title,
    message,
    isActive,
    updatedAt
  }
`;

export const emptySiteNotice = {
  title: "",
  message: "",
  isActive: false
};

export function normalizeSiteNotice(notice) {
  if (!notice) {
    return emptySiteNotice;
  }

  return {
    title: notice.title || "",
    message: notice.message || "",
    isActive: Boolean(notice.isActive),
    updatedAt: notice.updatedAt || ""
  };
}
