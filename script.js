// ==========================================
// ABNT Rápido - Lógica de Aplicação Principal
// ==========================================

// --- ESTADO GLOBAL ---
let activeTab = 'gerador';
let activeRefType = 'site';
let generatedHTML = '';

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Configurar Tema Escuro/Claro
    initTheme();

    // 2. Definir data de acesso como hoje
    const today = new Date().toISOString().split('T')[0];
    const acessoInput = document.getElementById('site-acesso');
    if (acessoInput) acessoInput.value = today;

    // 3. Ouvintes de Eventos de Formulário (tempo real)
    setupFormListeners();

    // 4. Ouvintes de botões e ações
    setupActions();

    // 5. Primeira renderização da prévia
    updateReference();
});

// ==========================================
// 1. TEMA ESCURO / CLARO
// ==========================================
function initTheme() {
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
    const themeToggleBtn = document.getElementById('theme-toggle');

    // Verifica preferência salva ou do sistema
    if (localStorage.getItem('color-theme') === 'dark' || 
        (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeToggleLightIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleDarkIcon.classList.remove('hidden');
    }

    // Toggle ao clicar no botão
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            themeToggleDarkIcon.classList.toggle('hidden');
            themeToggleLightIcon.classList.toggle('hidden');

            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
            }
        });
    }
}

// ==========================================
// 2. SANITIZAÇÃO DE DADOS (SEGURANÇA CONTRA XSS)
// ==========================================
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==========================================
// 3. NAVEGAÇÃO DE ABAS
// ==========================================
function switchTab(tabId) {
    const tabs = ['gerador', 'trabalhos', 'sobre', 'privacidade'];
    
    tabs.forEach(t => {
        const contentSection = document.getElementById(`tab-content-${t}`);
        const navBtn = document.getElementById(`btn-tab-${t}`);
        
        if (t === tabId) {
            contentSection.classList.remove('hidden');
            contentSection.classList.add('block');
            
            // Estilo ativo
            navBtn.className = "px-4 py-2 rounded-lg text-sm font-medium text-brand-600 dark:text-brand-500 bg-brand-50 dark:bg-brand-950/50 transition-colors";
        } else {
            contentSection.classList.add('hidden');
            contentSection.classList.remove('block');
            
            // Estilo inativo
            navBtn.className = "px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors";
        }
    });

    activeTab = tabId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Alternar tipo de gerador (Website vs Livro)
function switchRefType(type) {
    const btnSite = document.getElementById('btn-ref-site');
    const btnLivro = document.getElementById('btn-ref-livro');
    const formSite = document.getElementById('form-site');
    const formLivro = document.getElementById('form-livro');

    if (type === 'site') {
        formSite.classList.remove('hidden');
        formLivro.classList.add('hidden');
        
        btnSite.className = "flex-1 py-4 text-center font-outfit font-semibold text-sm border-b-2 border-brand-600 text-brand-600 dark:text-brand-500 dark:border-brand-500 flex justify-center items-center gap-2";
        btnLivro.className = "flex-1 py-4 text-center font-outfit font-semibold text-sm border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex justify-center items-center gap-2";
        activeRefType = 'site';
    } else {
        formSite.classList.add('hidden');
        formLivro.classList.remove('hidden');
        
        btnSite.className = "flex-1 py-4 text-center font-outfit font-semibold text-sm border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex justify-center items-center gap-2";
        btnLivro.className = "flex-1 py-4 text-center font-outfit font-semibold text-sm border-b-2 border-brand-600 text-brand-600 dark:text-brand-500 dark:border-brand-500 flex justify-center items-center gap-2";
        activeRefType = 'livro';
    }
    
    updateReference();
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
}

document.getElementById('mobile-menu-btn').addEventListener('click', toggleMobileMenu);

// ==========================================
// 4. LÓGICA DE FORMATAÇÃO ABNT
// ==========================================

// Converte "João da Silva" -> "SILVA, João da"
// Converte "Machado de Assis; Aluísio Azevedo" -> "ASSIS, Machado de; AZEVEDO, Aluísio"
function formatABNTAuthors(authorsStr) {
    if (!authorsStr || !authorsStr.trim()) return '';
    
    const authors = authorsStr.split(';').map(a => a.trim()).filter(Boolean);
    const suffixes = ['junior', 'filho', 'neto', 'sobrinho', 'jr', 'netto'];

    const formatted = authors.map(author => {
        // Se já contiver vírgula, assume que o usuário digitou no formato correto
        if (author.includes(',')) {
            const parts = author.split(',');
            return parts[0].trim().toUpperCase() + ', ' + parts.slice(1).join(',').trim();
        }

        const parts = author.split(/\s+/);
        if (parts.length === 1) {
            return parts[0].toUpperCase();
        }

        const lastName = parts[parts.length - 1];
        const firstName = parts.slice(0, parts.length - 1).join(' ');

        // Trata sufixos de parentesco
        if (suffixes.includes(lastName.toLowerCase()) && parts.length > 2) {
            const realLastName = parts[parts.length - 2] + ' ' + lastName;
            const realFirstName = parts.slice(0, parts.length - 2).join(' ');
            return realLastName.toUpperCase() + ', ' + realFirstName;
        }

        return lastName.toUpperCase() + ', ' + firstName;
    });

    if (formatted.length > 3) {
        // ABNT NBR 6023: mais de 3 autores usa et al.
        return formatted[0] + ' et al.';
    } else {
        return formatted.join('; ');
    }
}

// Formata mês em português de acordo com as regras de abreviação da ABNT
function formatABNTDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(monthIndex) || isNaN(day)) return '';

    const abntMonths = {
        0: 'jan.',
        1: 'fev.',
        2: 'mar.',
        3: 'abr.',
        4: 'maio', // Maio não tem ponto por não ser abreviação
        5: 'jun.',
        6: 'jul.',
        7: 'ago.',
        8: 'set.',
        9: 'out.',
        10: 'nov.',
        11: 'dez.'
    };

    const month = abntMonths[monthIndex] || '';
    return `${day} ${month} ${year}`;
}

// Formata título sem autor (primeira palavra em caixa alta, tudo em negrito)
function formatTitleWithoutAuthor(title) {
    const trimmed = title.trim();
    if (!trimmed) return '';
    
    const firstSpace = trimmed.indexOf(' ');
    if (firstSpace === -1) {
        return `<strong>${trimmed.toUpperCase()}</strong>`;
    }
    const firstWord = trimmed.substring(0, firstSpace).toUpperCase();
    const rest = trimmed.substring(firstSpace);
    return `<strong>${firstWord}${rest}</strong>`;
}

// ==========================================
// 5. GERAÇÃO EM TEMPO REAL
// ==========================================
function setupFormListeners() {
    const inputs = [
        'site-autor', 'site-titulo', 'site-nome', 'site-ano', 'site-url', 'site-acesso', 'site-toggle-brackets',
        'livro-autor', 'livro-titulo', 'livro-subtitulo', 'livro-edicao', 'livro-cidade', 'livro-editora', 'livro-ano'
    ];

    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const eventType = element.type === 'checkbox' ? 'change' : 'input';
            element.addEventListener(eventType, updateReference);
        }
    });
}

function updateReference() {
    const previewArea = document.getElementById('reference-preview');
    const previewContainer = document.getElementById('reference-preview-container');
    const previewBadge = document.getElementById('preview-badge');
    const btnCopiar = document.getElementById('btn-copiar');
    
    let htmlResult = '';
    let isValid = false;

    if (activeRefType === 'site') {
        const autor = escapeHTML(document.getElementById('site-autor').value);
        const titulo = escapeHTML(document.getElementById('site-titulo').value);
        const nomeSite = escapeHTML(document.getElementById('site-nome').value);
        const ano = escapeHTML(document.getElementById('site-ano').value);
        const url = escapeHTML(document.getElementById('site-url').value);
        const acesso = document.getElementById('site-acesso').value;
        const useBrackets = document.getElementById('site-toggle-brackets').checked;

        // Validação básica (título, url e data de acesso são obrigatórios)
        if (titulo && url && acesso) {
            isValid = true;
            
            const autorFormatado = formatABNTAuthors(autor);
            const dataAcessoFormatada = formatABNTDate(acesso);
            const urlExibicao = useBrackets ? `&lt;${url}&gt;` : url;
            
            if (autorFormatado) {
                htmlResult += `${autorFormatado}. <strong>${titulo}</strong>. `;
            } else {
                htmlResult += `${formatTitleWithoutAuthor(titulo)}. `;
            }

            if (nomeSite) {
                htmlResult += `${nomeSite}, `;
            }
            
            if (ano) {
                htmlResult += `${ano}. `;
            } else {
                htmlResult += `[s.d.]. `; // Sem data
            }

            htmlResult += `Disponível em: ${urlExibicao}. Acesso em: ${dataAcessoFormatada}.`;
        }
    } else {
        // Livro
        const autor = escapeHTML(document.getElementById('livro-autor').value);
        const titulo = escapeHTML(document.getElementById('livro-titulo').value);
        const subtitulo = escapeHTML(document.getElementById('livro-subtitulo').value);
        const edicao = escapeHTML(document.getElementById('livro-edicao').value);
        const cidade = escapeHTML(document.getElementById('livro-cidade').value);
        const editora = escapeHTML(document.getElementById('livro-editora').value);
        const ano = escapeHTML(document.getElementById('livro-ano').value);

        // Validação básica (Título, Cidade, Editora, Ano)
        if (titulo && cidade && editora && ano) {
            isValid = true;
            const autorFormatado = formatABNTAuthors(autor);
            
            let tituloRef = '';
            if (autorFormatado) {
                htmlResult += `${autorFormatado}. <strong>${titulo}</strong>`;
            } else {
                // Primeira palavra em caixa alta
                htmlResult += formatTitleWithoutAuthor(titulo);
            }

            if (subtitulo) {
                htmlResult += `: ${subtitulo}`;
            }
            
            htmlResult += '. ';

            if (edicao) {
                let edVal = edicao.trim();
                // Se for apenas número (ex: "2"), formata para "2. ed."
                if (/^\d+$/.test(edVal)) {
                    edVal = edVal + '. ed.';
                } else if (!edVal.toLowerCase().includes('ed')) {
                    // Se não tiver "ed", mas não for apenas número (ex: "2ª"), adiciona " ed."
                    edVal = edVal + ' ed.';
                }
                htmlResult += `${edVal} `;
            }

            htmlResult += `${cidade}: ${editora}, ${ano}.`;
        }
    }

    if (isValid && htmlResult) {
        generatedHTML = htmlResult;
        previewArea.innerHTML = htmlResult;
        previewArea.className = "w-full text-left text-slate-800 dark:text-slate-200 text-sm font-sans break-words select-all leading-relaxed";
        
        if (previewContainer) {
            previewContainer.className = "relative overflow-hidden p-6 bg-white dark:bg-slate-900 border border-brand-500/30 dark:border-brand-500/20 rounded-xl min-h-[140px] flex flex-col items-center justify-center transition-all duration-200 shadow-sm";
        }
        if (previewBadge) {
            previewBadge.classList.remove('hidden');
            previewBadge.classList.add('inline-block');
        }
        
        // Ativar botão copiar
        btnCopiar.disabled = false;
        btnCopiar.className = "w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 active:scale-[0.98] cursor-pointer";
    } else {
        generatedHTML = '';
        previewArea.innerHTML = `
            <div class="space-y-2 py-2 flex flex-col items-center justify-center select-none w-full">
                <svg class="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="text-xs text-slate-400 dark:text-slate-500 italic max-w-xs text-center mx-auto">Preencha os campos obrigatórios (*) para ver a referência bibliográfica formatada em tempo real.</p>
            </div>
        `;
        previewArea.className = "w-full text-slate-400 dark:text-slate-500 text-xs italic break-words select-all leading-relaxed text-center";
        
        if (previewContainer) {
            previewContainer.className = "relative overflow-hidden p-6 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl min-h-[140px] flex flex-col items-center justify-center transition-all duration-200";
        }
        if (previewBadge) {
            previewBadge.classList.add('hidden');
            previewBadge.classList.remove('inline-block');
        }
        
        // Desativar botão copiar
        btnCopiar.disabled = true;
        btnCopiar.className = "w-full py-3.5 px-4 bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md cursor-not-allowed select-none";
    }
}

// ==========================================
// 6. AÇÕES (LIMPAR E COPIAR)
// ==========================================
function setupActions() {
    const btnLimpar = document.getElementById('btn-limpar');
    const btnCopiar = document.getElementById('btn-copiar');

    if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            if (activeRefType === 'site') {
                document.getElementById('form-site').reset();
                // Redefinir data de acesso para hoje
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('site-acesso').value = today;
            } else {
                document.getElementById('form-livro').reset();
            }
            updateReference();
        });
    }

    if (btnCopiar) {
        btnCopiar.addEventListener('click', () => {
            if (!generatedHTML) return;
            
            // Criar versão em texto puro sem tags HTML para fallback
            const plainText = generatedHTML
                .replace(/<strong>/g, '')
                .replace(/<\/strong>/g, '')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');

            // Criar HTML adequado para clipboard (substituindo entidades HTML)
            const htmlClipboard = generatedHTML
                .replace(/&lt;/g, '&lt;')
                .replace(/&gt;/g, '&gt;');

            // Tenta copiar como Rich Text (HTML) para manter o negrito no Word/Docs
            try {
                const htmlBlob = new Blob([htmlClipboard], { type: 'text/html' });
                const textBlob = new Blob([plainText], { type: 'text/plain' });
                const data = [new ClipboardItem({
                    'text/html': htmlBlob,
                    'text/plain': textBlob
                })];

                navigator.clipboard.write(data).then(() => {
                    showCopySuccess();
                }).catch(err => {
                    // Fallback para texto plano se ClipboardItem falhar
                    fallbackWriteText(plainText);
                });
            } catch (e) {
                // Fallback para navegadores legados
                fallbackWriteText(plainText);
            }
        });
    }
}

function fallbackWriteText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showCopySuccess();
    }).catch(err => {
        console.error('Falha ao copiar:', err);
    });
}

function showCopySuccess() {
    const btnCopiar = document.getElementById('btn-copiar');
    const copyText = document.getElementById('copy-text');
    const copyIcon = document.getElementById('copy-icon');

    // Salva classes originais
    const originalClass = btnCopiar.className;
    
    // Altera para estado de Sucesso (verde)
    btnCopiar.className = "w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20";
    copyText.innerText = "Copiado com Sucesso!";
    
    // Ícone de check
    copyIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />`;

    // Retorna ao estado original após 2 segundos
    setTimeout(() => {
        btnCopiar.className = originalClass;
        copyText.innerText = "Copiar Referência";
        copyIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />`;
    }, 2000);
}


