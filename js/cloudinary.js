export async function uploadPlayerImage(file){


    const url =
    "https://api.cloudinary.com/v1_1/REPLACE_CLOUD_NAME/image/upload";


    const formData =
    new FormData();


    formData.append(
        "file",
        file
    );


    formData.append(
        "upload_preset",
        "REPLACE_UPLOAD_PRESET"
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



    return data.secure_url;


}
