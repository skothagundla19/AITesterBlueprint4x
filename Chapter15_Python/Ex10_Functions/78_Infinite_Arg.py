def print_mul_arg(*pramod_list):
    # args - List
    for i in pramod_list:
        print(i)


print_mul_arg("sudheer")
print_mul_arg(2, 3, 1, 4, 3, 2, 2, 2, 2, 2, 2)
print_mul_arg("sudheer", "kothagundla")
print_mul_arg("sudheer", "kothagundla", "third")
print_mul_arg("sudheer", "kothagundla", "third", 3.14)
print_mul_arg("sudheer", "kothagundla", "third", 3.14, True)