(function () {


let currentLang = "en";
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
            `/lang/${lang}.json`
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

        if (dictionary[key] !== undefined) {
            element.innerHTML = dictionary[key];
        }
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
        const key = element.getAttribute("data-i18n-aria-label");

        if (dictionary[key] !== undefined) {
            element.setAttribute("aria-label", dictionary[key]);
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





function detectLanguage(){


return (

localStorage.getItem(
    "selected_lang"
)

||

"en"

);


}





window.i18n={

setLanguage

};



window.t = function (key, fallback = key) {
    return dictionary[key] ?? fallback;
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