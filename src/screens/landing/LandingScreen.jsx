import React from "react";
import TopNavbar from "../../components/top-navbar/TopNavbar";

import styles from "./LandingScreen.module.css";

const LOREM_PARAGRAPH =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus, ut interdum tellus elit sed risus. Maecenas eget condimentum velit, sit amet feugiat lectus. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Praesent auctor purus luctus enim egestas, ac scelerisque ante pulvinar. Donec ut rhoncus ex. Suspendisse ac rhoncus nisl, eu tempor urna. Curabitur vel bibendum lorem. Morbi convallis convallis diam sit amet lacinia. Aliquam in elementum tellus. Curabitur tempor quis eros tempus lacinia. Nam bibendum pellentesque quam a convallis. Sed ut vulputate nisi. Integer in felis sed leo vestibulum elementum. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sagittis, nunc ac dapibus ultrices, mi risus blandit ipsum, sed feugiat metus dolor sit amet risus. Nunc imperdiet metus ac urna dapibus, sed rhoncus magna vehicula. Suspendisse commodo, arcu id ullamcorper commodo, nunc velit facilisis nunc, sit amet cursus arcu massa vel nunc. Donec convallis nunc a quam commodo, sed bibendum turpis vehicula. Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Cras mattis consectetur purus sit amet fermentum. Vestibulum id ligula porta felis euismod semper. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Donec sed odio dui. Nullam quis risus eget urna mollis ornare vel eu leo. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Vestibulum id ligula porta felis euismod semper. Etiam porta sem malesuada magna mollis euismod. Aenean lacinia bibendum nulla sed consectetur. Cras justo odio, dapibus ac facilisis in, egestas eget quam. Donec id elit non mi porta gravida at eget metus.";

// Placeholder marketing sections; content and copy will be replaced once final messaging is ready.
const SECTIONS = [
  { id: "intro", title: "Welcome to First Frame", variant: styles.sectionSubtle },
  { id: "features", title: "Everything You Need", variant: styles.sectionCard },
  { id: "cta", title: "Ready to Get Started", variant: styles.sectionSubtle },
];

const LandingScreen = () => {
  return (
    <React.Fragment>
      <TopNavbar />

      <main className={styles.page}>
        {SECTIONS.map((section) => (
          <section key={section.id} className={`${styles.section} ${section.variant}`}>
            <div className={styles.sectionContent}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              <p className={styles.sectionText}>{LOREM_PARAGRAPH}</p>
            </div>
          </section>
        ))}
      </main>
    </React.Fragment>
  );
};

export default LandingScreen;
