import axios from "axios";

async function addToMailingList(userId: string, isEmailSubscriber: boolean) {
  await axios.put("/user/email-subscription", { isEmailSubscriber }, {
    params: { id: userId, }
  });
}


export default {
  addToMailingList,
}
