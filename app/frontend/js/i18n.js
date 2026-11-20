(function () {


let currentLang = "hi";
let dictionary = {};



const LANGUAGES = [
    {
        code:"en",
        native:"English"
    },
    {
        code:"hi",
        native:"हिन्दी"
    },
    {
        code:"bn",
        native:"বাংলা"
    },
    {
        code:"kn",
        native:"ಕನ್ನಡ"
    },
    {
        code:"ta",
        native:"தமிழ்"
    },
    {
        code:"te",
        native:"తెలుగు"
    },
    {
        code:"gu",
        native:"ગુજરાતી"
    },
    {
        code:"ml",
        native:"മലയാളം"
    },
    {
        code:"or",
        native:"ଓଡ଼ିଆ"
    },
    {
        code:"mr",
        native:"मराठी"
    },
    {
        code:"as",
        native:"অসমীয়া"
    }
];




async function loadLanguage(lang){


    try{

        const res = await fetch(
            `./lang/${lang}.json`
        );


        dictionary = await res.json();


    }
    catch(e){

        console.log(
            "Language load failed",
            e
        );

    }

}


function translatePage() {

    document.querySelectorAll("[data-i18n]").forEach(element => {

        const key = element.getAttribute("data-i18n");

        const translatedText = getNestedValue(dictionary, key);

        if (translatedText !== undefined) {
            element.innerHTML = translatedText;
        }

    });


    document.querySelectorAll("[data-i18n-aria-label]").forEach(element => {

        const key = element.getAttribute("data-i18n-aria-label");

        const translatedText = getNestedValue(dictionary, key);

        if (translatedText !== undefined) {
            element.setAttribute("aria-label", translatedText);
        }

    });


    if (dictionary.page_title) {
        document.title = dictionary.page_title;
    }

}




async function setLanguage(lang){


currentLang = lang;


localStorage.setItem(
    "selected_lang",
    lang
);


localStorage.setItem(
    "app_lang",
    lang
);



await loadLanguage(lang);


translatePage();



}

function getNestedValue(obj, key) {
    return key.split(".").reduce((value, part) => {
        return value !== undefined && value !== null
            ? value[part]
            : undefined;
    }, obj);
}





function detectLanguage(){


return (

localStorage.getItem(
    "selected_lang"
)

||

"hi"

);


}





window.i18n = {
    setLanguage,
    translatePage
};



window.t = function (key, fallback = key) {
    return getNestedValue(dictionary, key) ?? fallback;
};





document.addEventListener(
"DOMContentLoaded",
async ()=>{


let lang =
detectLanguage();


await setLanguage(lang);



const selector =
document.getElementById(
"languageSelect"
);



if(selector){


selector.value = lang;



selector.addEventListener(
"change",
async(e)=>{


await setLanguage(
e.target.value
);


}


);


}



});



})();