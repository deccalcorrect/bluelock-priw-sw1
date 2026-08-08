const cloudName = "y3in3pxq";

const uploadPreset = "bluelock_players";


export async function uploadPlayerImage(file){

const url =
`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;


const formData = new FormData();


formData.append(
"file",
file
);


formData.append(
"upload_preset",
uploadPreset
);



const response = await fetch(
url,
{
method:"POST",
body:formData
}
);


const data = await response.json();


return data.secure_url;

}
