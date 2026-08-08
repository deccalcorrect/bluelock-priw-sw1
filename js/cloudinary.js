export async function uploadPlayerImage(file) {


    if(!file){
        return "";
    }



    const url =
    "https://api.cloudinary.com/v1_1/np1piqjg/image/upload";



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



    const response =
    await fetch(
        url,
        {
            method:"POST",
            body:formData
        }
    );



    const data =
    await response.json();



    if(!data.secure_url){

        console.log(data);

        throw new Error(
            "Fotoğraf yüklenemedi"
        );

    }



    return data.secure_url;


}
