export async function uploadPlayerImage(file) {


    if(!file){
        return "";
    }



    const url =
    "https://api.cloudinary.com/v1_1/y3in3pxq/image/upload";



    const formData =
    new FormData();



    formData.append(
        "file",
        file
    );



    formData.append(
        "upload_preset",
        "bluelock_players"
    );



    let response;

    try {
        response = await fetch(url, {
            method: "POST",
            body: formData
        });
    } catch (networkError) {
        console.error("Cloudinary bağlantı hatası:", networkError);
        throw new Error("Fotoğraf yüklenemedi: sunucuya bağlanılamadı (internet/CORS kontrol et)");
    }

    const data =
    await response.json();



    if(!data.secure_url){

        console.error("Cloudinary yanıtı:", data);

        const reason = data?.error?.message || "bilinmeyen hata";

        throw new Error(
            "Fotoğraf yüklenemedi: " + reason
        );

    }



    return data.secure_url;


}
