const GoButton = document.getElementById('go');
GoButton.disabled = true;

async function getJson() {
    const resp = await fetch('search-index.json');
    const data = await resp.json();
    return data;
}

const SearchIndexJson = await getJson();

GoButton.disabled = false;

const search = async () => {
    console.log(SearchIndexJson);
    
}

GoButton.addEventListener('click', async () => {
    GoButton.disabled = true;
    await search();
    GoButton.disabled = false;
});