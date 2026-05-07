'use client';

import { useEffect, useState } from 'react';
import legacyPages from './legacyPages';

type PageKey = keyof typeof legacyPages;

type ScriptDefinition = {
  src: string;
  type?: 'module';
};

const pageScripts = {
  auth: [
    { src: '/scripts/matrix.js', type: 'module' },
    { src: '/scripts/auth.js', type: 'module' }
  ],
  editor: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/css/css.min.js' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/clike/clike.min.js' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/closebrackets.min.js' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/matchbrackets.min.js' },
    { src: '/scripts/matrix.js', type: 'module' },
    { src: '/scripts/editor.js', type: 'module' }
  ],
  admin: [
    { src: '/scripts/matrix.js', type: 'module' },
    { src: '/scripts/admin.js', type: 'module' }
  ]
} satisfies Record<PageKey, ScriptDefinition[]>;

function loadScript(definition: ScriptDefinition, token: string) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const isLocalScript = definition.src.startsWith('/scripts/');
    script.src = isLocalScript ? `${definition.src}?page=${encodeURIComponent(token)}` : definition.src;
    if (definition.type) script.type = definition.type;
    script.async = false;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

type LegacyPageProps = {
  page: PageKey;
};

export default function LegacyPage({ page }: LegacyPageProps) {
  const [markup, setMarkup] = useState('');
  const [pageToken, setPageToken] = useState<string>(page);
  const pageDefinition = legacyPages[page] || legacyPages.auth;

  useEffect(() => {
    setPageToken(`${page}:${window.location.search}`);
  }, [page]);

  useEffect(() => {
    document.title = pageDefinition.title;
    document.body.className = pageDefinition.bodyClass;
    setMarkup(pageDefinition.markup);

    return () => {
      document.body.className = '';
    };
  }, [pageDefinition, pageToken]);

  useEffect(() => {
    if (!markup) return;
    let active = true;

    async function bootScripts() {
      window.__hackcodePageToken = pageToken;

      try {
        for (const script of pageScripts[page] || []) {
          if (!active) return;
          await loadScript(script, pageToken);
        }

        if (active) {
          document.dispatchEvent(new CustomEvent('hackcode:ready', { detail: { page, token: pageToken } }));
        }
      } catch (error) {
        console.error('[HackCode] Falha ao carregar scripts da página:', error);
        document.getElementById('boot-screen')?.remove();
      }
    }

    bootScripts();

    return () => {
      active = false;
    };
  }, [markup, page, pageToken]);

  return (
    <div
      key={pageToken}
      className="contents"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
