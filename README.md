# PollApp

PollApp is a web application for creating, managing, and evaluating surveys.

## Features

- Create surveys with categories, an end date, and multiple questions.
- Add answer options for each question and allow multiple answers.
- Display active and past surveys on the home page.
- Answer surveys or complete them without making a selection.
- View live results with vote percentages.
- Use the application on desktop, tablet, and mobile devices.

## Development

### Prerequisites

- Node.js 20 or newer
- npm 11 or newer

### Installation

```bash
npm install
```

### Start the development server

```bash
npm start
```

Open [http://localhost:4200/angular-project/](http://localhost:4200/angular-project/) in a browser. The application automatically refreshes when source files change.

### Generate a component

Generate a standalone Angular component inside the application source directory:

```bash
npx ng generate component component-name
```

Replace `component-name` with the desired component path, for example:

```bash
npx ng generate component home/example-component
```

## Production Build

```bash
npm run build
```

The generated files are stored in `dist/PollApp/browser/`. Upload the contents of this folder to the `angular-project/` directory on the web server.
