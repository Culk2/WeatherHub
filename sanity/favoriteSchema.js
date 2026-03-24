export default {
  name: "favorite",
  title: "Favorite",
  type: "document",
  fields: [
    {
      name: "clerkUserId",
      title: "Clerk User ID",
      type: "string",
      validation: (Rule) => Rule.required()
    },
    {
      name: "cityName",
      title: "City Name",
      type: "string",
      validation: (Rule) => Rule.required()
    },
    {
      name: "country",
      title: "Country",
      type: "string"
    },
    {
      name: "latitude",
      title: "Latitude",
      type: "number",
      validation: (Rule) => Rule.required()
    },
    {
      name: "longitude",
      title: "Longitude",
      type: "number",
      validation: (Rule) => Rule.required()
    },
    {
      name: "createdAt",
      title: "Created At",
      type: "datetime",
      validation: (Rule) => Rule.required()
    }
  ]
};
