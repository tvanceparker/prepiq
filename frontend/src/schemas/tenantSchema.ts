import * as Yup from "yup";

export const tenantInfoSchema = Yup.object({
  name: Yup.string().required("Restaurant name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  phone: Yup.string()
    .matches(/^\(\d{3}\) \d{3}-\d{4}$/, "Invalid phone number format")
    .required("Phone is required"),
  address: Yup.string().required("Address is required"),
  city: Yup.string().required("City is required"),
  state: Yup.string().required("State is required"),
  zip_code: Yup.string()
    .matches(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format")
    .notRequired(),
  // add other fields as needed
});
