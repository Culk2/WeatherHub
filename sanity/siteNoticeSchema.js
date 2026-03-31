export default {
  name: "siteNotice",
  title: "Site Notice",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string"
    },
    {
      name: "message",
      title: "Message",
      type: "text"
    },
    {
      name: "isActive",
      title: "Is Active",
      type: "boolean",
      initialValue: false
    },
    {
      name: "updatedAt",
      title: "Updated At",
      type: "datetime"
    }
  ]
};
