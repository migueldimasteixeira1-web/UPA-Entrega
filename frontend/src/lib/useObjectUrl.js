import { useEffect, useState } from 'react';

// Cria uma blob URL só quando `file` muda e revoga a anterior — sem isso,
// URL.createObjectURL(file) direto no JSX cria uma URL nova a cada
// re-render sem nunca liberá-la (issue #54: sensível sobretudo no app do
// entregador, rodando em celulares com pouca memória).
export function useObjectUrl(file) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
}
