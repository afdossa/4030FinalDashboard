# Using forces in D3

The scope of this exercise is to play with forces and force directed layout to creat networks and trees visualizations.

### Step 1 

In the following chart we are using forces on simple objects. Right now, bubbles' positions is adjusted using forceCenter() while forceCollide() assumes all circles have radius 10.
Change the function in `PropertyTypeDumbbell.js` in order to set a different force based on the bubble radius. The intended result is having no bubbles intersecting each other.

Once you are satisfied with the result update your code on Github and add a screenshot of your result directly on the repository.

### Step 2

Uncomment the line `<!-- <script src="App.js"></script> -->` from your `index.html` file and open `App.js`.
Here you will have to draw a network using a force directed layout. As a first step, read the information about your graph from the file `miserables.json`.
Then, update the code following the `TODO` instructions.

Once you are satisfied with the result update your code on Github and add a screenshot of your result directly on the repository.

### Step 3

Uncomment the line `<!-- <script src="TownComparisonChart.js"></script> -->` from your `index.html` file and open `TownComparisonChart.js`.
Here we are trying to draw a very small hiearchy starting from a given dataset already stored in the variable `family`.

Take a look at the dataset first. You will notice a clear paret-child relationship which should appear in our tree visualization.

- Study the function `d3.hierarchy` from the API and process the hierarhcy of nodes. 

- create a new variable called `root` storing the result of calling `d3.hierarchy` on `family`. Once you run the function, study the accessors that have been generated and are now stored in root. These will simplify the access to some entity of your hierarchy like, for example (links, or the descendents)

- Study the function `d3.tree` from the API. Generally, you can create a tree layout in two ways. By setting the tree size (with `.size([width,height]`)) which specifices the size for the overall layout, or, by setting the distance between each layer in the hierarchy (`.nodeSize[xd,yd]`). Play with both functions once the final hierarchy is visualized to see how the tree layout changes.

- Complete the reamining code following the `TODO` comments


Once you are satisfied with the result update your code on Github and add a screenshot of your result directly on the repository.

As a final submission, upload on Gradescope the three visualizations obtained plus the javascript files you have modified.
