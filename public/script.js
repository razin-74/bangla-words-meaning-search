document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultContainer = document.getElementById('result');
    const loader = document.getElementById('loader');
    const errorMsg = document.getElementById('error');
    const historyContainer = document.getElementById('history');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistory');

    // Result elements
    const resultWord = document.getElementById('resultWord');
    const pronunciation = document.getElementById('pronunciation');
    const meaningText = document.getElementById('meaningText');
    const exampleList = document.getElementById('exampleList');
    const synonymContainer = document.getElementById('synonymContainer');
    const sourceInfo = document.getElementById('sourceInfo');

    const MAX_HISTORY = 10;

    const getHistory = () => {
        const history = localStorage.getItem('searchHistory');
        return history ? JSON.parse(history) : [];
    };

    const saveToHistory = (word) => {
        let history = getHistory();
        // Remove word if it already exists (to move it to top)
        history = history.filter(item => item !== word);
        // Add to top
        history.unshift(word);
        // Limit to MAX_HISTORY
        if (history.length > MAX_HISTORY) {
            history = history.slice(0, MAX_HISTORY);
        }
        localStorage.setItem('searchHistory', JSON.stringify(history));
        renderHistory();
    };

    const renderHistory = () => {
        const history = getHistory();
        if (history.length === 0) {
            historyContainer.classList.add('hidden');
            return;
        }

        historyList.innerHTML = '';
        history.forEach(word => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.textContent = word;
            item.addEventListener('click', () => {
                searchInput.value = word;
                searchWord();
            });
            historyList.appendChild(item);
        });
        historyContainer.classList.remove('hidden');
    };

    const searchWord = async () => {
        const word = searchInput.value.trim();
        if (!word) return;

        // Reset UI
        resultContainer.classList.add('hidden');
        errorMsg.classList.add('hidden');
        loader.classList.remove('hidden');

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ word }),
            });

            const data = await response.json();

            if (response.ok) {
                displayResult(data);
                saveToHistory(word);
            } else {
                showError(data.error || 'খোঁজার সময় একটি সমস্যা হয়েছে।');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showError('সার্ভারের সাথে সংযোগ করা সম্ভব হচ্ছে না।');
        } finally {
            loader.classList.add('hidden');
        }
    };

    const displayResult = (data) => {
        resultWord.textContent = data.word;
        pronunciation.textContent = data.pronunciation ? `[ ${data.pronunciation} ]` : '';
        meaningText.textContent = data.meaning;

        // Clear and add examples
        exampleList.innerHTML = '';
        if (data.examples && data.examples.length > 0) {
            data.examples.forEach(ex => {
                const li = document.createElement('li');
                li.textContent = ex;
                exampleList.appendChild(li);
            });
        } else {
            exampleList.innerHTML = '<li>কোনো উদাহরণ পাওয়া যায়নি।</li>';
        }

        // Clear and add synonyms
        synonymContainer.innerHTML = '';
        if (data.synonyms && data.synonyms.length > 0) {
            data.synonyms.forEach(syn => {
                const span = document.createElement('span');
                span.textContent = syn;
                synonymContainer.appendChild(span);
            });
        } else {
            synonymContainer.innerHTML = '<span>সমার্থক শব্দ পাওয়া যায়নি।</span>';
        }

        sourceInfo.textContent = data.source === 'local' ? 'উৎস: স্থানীয় স্টোরেজ' : 'উৎস: কৃত্রিম বুদ্ধিমত্তা (AI)';

        resultContainer.classList.remove('hidden');
    };

    const showError = (message) => {
        errorMsg.textContent = message;
        errorMsg.classList.remove('hidden');
    };

    searchBtn.addEventListener('click', searchWord);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchWord();
        }
    });

    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('searchHistory');
        renderHistory();
    });

    // Initial load
    renderHistory();
    searchInput.focus();
});
