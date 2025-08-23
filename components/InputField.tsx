import { InputFieldProps } from "@/types/type";
import {
    Keyboard,
    KeyboardAvoidingView,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from "react-native";
import { IconSymbol } from "./ui/IconSymbol";

const InputField = ({ 
    label, 
    labelStyle, 
    icon,
    iconColor = "#000",
    iconSize = 24,
    iconStyle, 
    secureTextEntry = false, 
    containerStyle, 
    inputStyle, 
    className, 
    ...props } : InputFieldProps) => (
    <KeyboardAvoidingView>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="my-2 w-full">
                <Text className={`text-lg mb-3 ${labelStyle}`}>
                    {label}
                </Text>
                <View
                className={`flex flex-row justify-start items-center relative bg-neutral-100 rounded-full border border-neutral-100 focus:border-primary-500 ${containerStyle}`}>
                    {icon && (
                        <IconSymbol name={icon} color={iconColor} size={iconSize} className={`${iconStyle}`}/>
                    )}
                    <TextInput
                        className={`rounded-full p-4 text-[15px] flex-1 ${inputStyle} text-left`}
                        secureTextEntry={secureTextEntry}
                        {...props}
                    />
                </View>
            </View>
        </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
)

export default InputField;