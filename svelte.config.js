/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        prerender: {
            handleHttpError: ({ path, referrer, message }) => {
                // Ignora erros de imagens externas e links dinâmicos no pré-renderizador estático
                if (path.includes('http://') || path.includes('https://') || path.includes('unsplash') || path.includes('evidencemeta')) {
                    return;
                }
                console.warn(`Prerender HTTP warning on ${path} (from ${referrer}): ${message}`);
            }
        }
    }
};

export default config;
