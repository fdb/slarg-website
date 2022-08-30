# SLARG Website

This is the source code for the Sint Lucas Antwerpen Research Group (SLARG) website.

It is written using [11ty](https://www.11ty.dev/) and hosted on [Netlify](https://netlify.app/). We use [Netlify CMS](https://www.netlifycms.org/) to manage the content. Images are uploaded to [Uploadcare](https://uploadcare.com/).

## Developing

Install dependencies with `npm install`. Then, to start the development server:

```
npm start
```

## Building

When pushing to the `main` branch, the site will be deployed automatically to Netlify. To create a local production version of the site:

```
npm run build
```