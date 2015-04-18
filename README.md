# Work in progress

## TODO

* Managing connected Devices
  * Add / Commit an Access Token
  * Remove a Connection

Authentication of new Devices will be initialized by scanning a QR-Code from the Washing Machine Interface.
This Code contains the IP-Address of the Washing Machine and a Access Token for the new App.

* API
  * Setup
    * Set type of washing powder
    * Set type of fabric conditioner
  * Info/Stats (over all, last, current)
  * Running: Get cycle for current washing program
  * Get washing program
  * Get washing powder fill level
  * Get fabric conditioner fill level
  * Get water used for washing
  * Get electricity used for washing
  * Get washing powder used for washing
  * Get fabric conditioner used for washing
  * Get time spend for washing
  * Get load weight
  * Get water hardness
  * Get type of load
  * Get color of load
  * Get additional settings
  * Get temperature used
  * Get speed used
  * Get over all duration
  * Get ground water temperature
  * Get type of washing powder
  * Get type of fabric conditioner

### Washing Cycles:

A normal wash program consists of a Wash, followed by a Rinse, followed by a Spin cycle.

**Wash** — Fill the machine to a certain water level, dispense any chemicals from dispensers, agitate the load for a certain amount of time and drain the water

**Rinse** — Fill the machine to a certain water level, agitate the load for a certain amount of time and drain the water

**Spin** — Spin the basket rapidly for a certain amount of  time with the drain open so most remaining water is removed by the  centrifugal force

**Soak** — Fill the machine to a certain water level, sit for a period of time, and then drain the water

**Pre-Wash** — Is a wash cycle (fill, agitate, drain). Sometimes, the Pre-Wash can continue into a Soak or continue into a normal washing machine cycle

**Extra Rinse** — The wash-rinse-spin setting will be followed by yet another rinse. This  rinse is used to confirm that all the soap is removed from your clothes.

**Quick Wash** —  Is intended to be a wash for when your clothes aren’t that dirty or they need refreshing before you’d like to put them on.

http://www.marottaonmoney.com/the-complete-guide-to-your-washing-machine/

**Cotton, linen or normal** — Higher spin speeds and average cycle lengths

**Permanent press, casual** — Average or slightly slower spin speeds

**Colors** — Cold wash and rinse temperatures

**Quick or speed wash** — Hot water and less time in the wash cycle

**Delicates, hand-wash, wool** — Cold water wash and rinse, plus spin slower or not at all

**Pre-soak** — Pause for a certain time during the wash cycle between filling the machine with water and starting agitation

**Bulky or heavy** — Slower spin cycle

**Sanitize** — Hottest water available during the wash cycle

http://home.howstuffworks.com/appliances/energy-efficient/how-do-washing-machines-get-clothes-clean3.htm

### Washing Powder & Fabric Conditioner API

The water hardness indicates the amount of existing lime, calcium and magnesium in the water. The higher the percentage, the higher the degree of water hardness. Scale to build up in the machine, but also to the laundry and decrease by blockade of surfactants in detergent washing performance. Therefore, the dose of detergent depends on the degree of water hardness, the harder the water, the more detergent must be dosed to achieve the same cleaning effect. In softer water can be less dose, thus protects the environment by reducing consumption of detergent and additional descaler and also saves money.

### Auto dose of detergents

//TODO
