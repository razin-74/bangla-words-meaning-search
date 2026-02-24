document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultContainer = document.getElementById('result');
    const loader = document.getElementById('loader');
    const errorMsg = document.getElementById('error');

    // Result elements
    const resultWord = document.getElementById('resultWord');
    const pronunciation = document.getElementById('pronunciation');
    const meaningText = document.getElementById('meaningText');
    const exampleList = document.getElementById('exampleList');
    const synonymContainer = document.getElementById('synonymContainer');
    const sourceInfo = document.getElementById('sourceInfo');

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

    // Focus input on load
    searchInput.focus();
});
