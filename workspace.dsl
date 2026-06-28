workspace "Big Bank" "" {
  model {
    customer = person "Personal Banking Customer" "A customer of the bank."
    internetBankingSystem = softwareSystem "Internet Banking System" "Allows customers to view account balances."
    mainframe = softwareSystem "Mainframe Banking System" "Stores account information."

    customer -> internetBankingSystem "Views account balances and makes payments using"
    internetBankingSystem -> mainframe "Gets account information from and makes transactions using"
  }
  views { }
}
