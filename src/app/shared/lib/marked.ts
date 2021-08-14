import { MarkedOptions, MarkedRenderer } from "ngx-markdown";
import DOMPurify from 'dompurify';

export function markedOptionsFactory(): MarkedOptions {
  const renderer = new MarkedRenderer();
  const linkRenderer = renderer.link;

  renderer.link = (href, title, text) => {
    const html = linkRenderer.call(renderer, href, title, text);
    return html.replace(/^<a /, '<a target="_blank" ');
  };

  return {
    renderer,
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    sanitizer: DOMPurify.sanitize,
    smartLists: true,
    smartypants: false,
  };
}
