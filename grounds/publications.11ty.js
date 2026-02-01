const slugify = require("slugify");

module.exports = class {
  data() {
    return {
      pagination: {
        data: "groundsPublicationsList",
        size: 1,
        alias: "publication",
      },
      eleventyComputed: {
        permalink: (data) => {
          const pub = data.publication;
          const slug = pub?.slug || (pub?.title ? slugify(pub.title, { lower: true }) : "ground");
          return `/grounds/${slug}/index.html`;
        },
        title: (data) => data.publication?.title,
        author: (data) => data.publication?.author,
        ground_date: (data) => data.publication?.ground_date,
        people: (data) => data.publication?.people,
        description: (data) => data.publication?.description,
        thumbnail: (data) => data.publication?.thumbnail,
        ground_file: (data) => data.publication?.ground_file,
      },
      layout: "ground.liquid",
    };
  }

  render() {
    return "";
  }
};
