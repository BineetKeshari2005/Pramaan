export function renderPage(data) {
  return `<main>${data}</main>`;
}

export const formatDate = (d) => d.toISOString();

export class Widget {
  render() {
    return renderPage("widget");
  }
}
